# NexusOS — Architectural Reference

This document is the authoritative description of the NexusOS architecture as implemented in this repository. It is written for engineers who need to extend the kernel, modify the shell, integrate a new inference provider, or evaluate the system for safety properties. It does not describe future or aspirational behavior; design intent that has not yet been implemented is marked as such.

---

## 1. Architectural overview

NexusOS is structured as five concentric layers. Privilege increases as one moves inward; only the kernel and native bridge can effect persistent change.

| Layer | Directory | Responsibility |
|---|---|---|
| 1. Shell UI | `App.tsx`, `components/`, `apps/` | Render system state, capture user input, mount applications. |
| 2. State | `store/` | Single source of runtime truth (Zustand). |
| 3. Kernel | `kernel/` | Virtual file system, autonomy engine, command engine, permission system, event bus, process manager, action protocol. |
| 4. Services | `services/` | AI inference (local and remote), memory graph, cloud fallback. |
| 5. Native | `electron-main.cjs`, `preload.cjs`, `daemon-bridge-server.cjs` | Host operating-system access through Electron IPC and a localhost-bound bridge server. |

Each layer communicates through well-defined surfaces:

- **Shell ↔ State** through the Zustand `useOS` hook.
- **State ↔ Kernel** through direct module imports; the kernel mutates the store via its actions.
- **Kernel ↔ Services** through service singletons (`localBrain`, `aiGateway`).
- **Services ↔ Native** through the Electron `ipcRenderer.invoke` bridge exposed by `preload.cjs` under a fixed channel allow-list.

There is no path from the shell to the host operating system that does not pass through both the kernel (for state coherence) and the IPC bridge (for capability containment).

---

## 2. Shell layer

The shell is rendered by React 19. The entry point is `index.tsx`, which mounts `App.tsx`. `App.tsx` orchestrates:

- Boot sequence detection (BIOS interception via the F2 key).
- Login resolution against the persisted session.
- Hydration of the Zustand store.
- Kernel initialization (`vfs.init()`, `daemonBridge.boot()`, `autonomy.start()` if enabled).
- Window rendering.
- Global keyboard shortcuts (`Ctrl+Space`, `Ctrl+T`, `Ctrl+E`, etc.).

The shell deliberately contains no business logic. Application state is read from the store; mutations are dispatched through store actions. Where the shell needs kernel capabilities (open a file, create a window), it calls store actions, which in turn call kernel modules.

### 2.1 Built-in applications

The `apps/` directory contains 52 application components. Each component is a React function component. Applications are registered through `appRegistry.ts`, which is the single source of truth for which applications exist, what permissions they require, and how they should be presented in the start menu.

Each entry in the registry is an `AppManifest` (defined in `types.ts`):

```ts
interface AppManifest {
  id: string;
  name: string;
  description?: string;
  icon: LucideIcon;
  component?: AppComponent;
  permissions: ('vfs.read' | 'vfs.write' | 'network' | 'kernel.modify')[];
  hidden?: boolean;
  isCustom?: boolean;
  sourcePath?: string;
  defaultSize?: { width: number; height: number };
}
```

The registry is consumed by:
- the start menu (discovery and search),
- the window manager (`openWindow(appId)` lookup),
- the permission system (`permissions.hasPermission(appId, ...)`),
- the autonomy engine (knowing which applications it can open),
- the VFS (translating `appId` into an authorization decision).

### 2.2 Window management

Windows are stored in the Zustand store as `WindowState` records (id, appId, geometry, z-index, minimized/maximized flags, optional workspace id, optional payload). The shell renders each non-minimized window through `react-rnd`. Focus changes update z-index by remapping the entire window list.

The current implementation re-maps the entire `windows` array on every focus change. This is correct but produces O(n) re-render cost on focus; the architectural roadmap recommends splitting window position state into a separate slice consumed by selectors.

---

## 3. State layer

The store is a Zustand store under `store/osStore.ts`. It is currently monolithic (one root store) but is being decomposed into per-domain slices in `store/osStoreSlices.ts`.

### 3.1 State domains

| Domain | Purpose |
|---|---|
| Session | Active user, authentication state, profile metadata |
| Windows | Open windows, focused window id, z-index ordering |
| Registry | Installed applications, pinned applications |
| Notifications | System notification queue |
| Autonomy | DAEMON state machine, autonomy log, current objective, kill switch |
| Theme | Color palette, wallpaper id, accent, dark/light flag |
| Clipboard | Persistent clipboard history with favorites |
| UI | Start menu open, search active, BIOS mode, lock state |

### 3.2 Persistence

Selective persistence is implemented at the slice level: durable state (preferences, installed apps, autonomy log, clipboard, wallpaper) is mirrored to `localStorage`; transient state (window positions, focused window, BIOS mode) is not.

The VFS does **not** live in the Zustand store. It is a separate kernel singleton with its own persistence path (IndexedDB) and its own cache. The store is informed of VFS changes through the event bus.

### 3.3 Store id and default state

`store/osStore.ts` exports `createDefaultStoreState()` and `makeStoreId(seed?)`. The first returns the canonical empty state; the second derives a stable identifier used for telemetry and as the persistence key. Both are covered by `kernel/tests/store.test.ts`.

---

## 4. Kernel layer

The kernel is implemented as 27 TypeScript modules under `kernel/`. Each module is a singleton (either an exported class instance or a module-scoped state object). Direct dependencies between kernel modules are kept minimal; cross-module communication preferentially uses the event bus.

### 4.1 Virtual file system — `fileSystem.ts`

A POSIX-shaped tree (`file`, `directory`, `symlink`) persisted to IndexedDB with a `localStorage` fallback. The constructor seeds the in-memory tree from `INITIAL_FS` so the OS can render before storage hydration completes; `init()` then asynchronously rehydrates from IndexedDB or, on failure, from the legacy `localStorage` mirror.

| Property | Implementation |
|---|---|
| Storage | IndexedDB (`NexusOS_VFS` database, `vfs_store` object store) with `localStorage` (key `nexus_vfs_v1`) fallback |
| Persistence model | Full-tree write on debounced 100 ms interval (the `save()` queue collapses bursts into a single transaction) |
| Permission model | `vfs.read` and `vfs.write` enforced per call; missing `appId` is denied; `__system__` bypasses checks |
| Path normalization | Rejects null bytes, `..` segments, non-absolute paths; absolute path resolution against the active home directory |
| Symlinks | Resolved recursively with a depth cap of 10 |
| Events | `VFS_FILE_CREATED`, `VFS_FILE_MODIFIED`, `VFS_FILE_DELETED`, `VFS_DIR_CREATED` |

Operations: `listDir`, `readFile`, `writeFile`, `createDir`, `delete`, `move`, `moveMany`, `createSymlink`, `moveToTrash`, `updateMetadata`, `getStats`, `stat`, `resolveNode`.

The complete behavioral specification is in [`VFS_SPEC.md`](VFS_SPEC.md). The current implementation has known limitations: there is no explicit recycle-bin metadata model beyond path moves, no audit trail beyond event emission, no resource locking, and no persistence encryption. These limitations are deliberate; the VFS is the simplest design that supports the rest of the system.

### 4.2 Process manager — `processManager.ts`

A logical process model that mirrors the window manager. Each open window has a corresponding process record with a PID, an estimated memory footprint, an uptime counter, and a priority. The Task Manager application reads from this module.

The process model is purely informational: there is no actual subprocess; the "process" is a record describing a window's lifecycle. This is sufficient for the in-browser execution model and is a deliberate simplification.

### 4.3 Event bus — `eventBus.ts`

A typed pub/sub system. The kernel uses it for:

- VFS change notifications consumed by the file watcher and by the daemon bridge.
- Autonomy state transitions consumed by the dashboard and the holographic UI.
- DAEMON urgent events consumed by the self-healing pipeline.
- Theme changes broadcast to the shell.

The event bus retains a bounded history for diagnostics. It does not provide delivery guarantees; subscribers added after a `emit()` call do not see the past event.

### 4.4 Permission system — `permissions.ts`

The permission set is fixed at four capabilities:

```
vfs.read, vfs.write, network, kernel.modify
```

Permissions are declared in the application manifest (`appRegistry.ts`) and consulted by the VFS, by the application registry, and by application code that wishes to gate a feature behind a capability. The `enforce(appId, permission, action?)` method throws if the permission is absent. Runtime overrides are supported through `grant()` and `revoke()`; overrides are in-memory and do not persist across reloads.

The current model is per-application. The autonomy roadmap calls for a per-agent extension (each AI agent receives its own scope at spawn) and for additional capabilities (`shell.exec`, `agent.spawn`, `model.swap`, `vfs.delete`, `network.fetch.<host>`, `process.kill`).

### 4.5 Autonomy engine — `autonomy.ts`

The autonomy engine implements the system's autonomous behavior. It is a self-rescheduling loop driven by a fractal delay function and a scored mission pool.

**Tick loop.** `runFractalTick()` invokes `tick()`, catches any rejection, and schedules the next tick after a delay computed by `calculateNextFractalDelay()`. The delay formula is `V = 7 · 2^n · 3^k`, where `n` is the open-window count (capped at 5) and `k` is the recent event-density count (capped at 3); the delay decreases as activity increases. The kill switch is `kernelRules.autonomyEnabled` and is checked at the top of `tick()`.

**Mission selection.** `MISSION_POOL` is a static array of mission descriptors; each carries a `weight(snapshot)` function that scores the mission against the current `SystemSnapshot` (open windows, VFS contents, recent memory, RAM usage). The highest-scoring mission is selected on each tick with a small randomization term for exploration.

**Decision protocol.** The selected mission is rendered into a JSON-output prompt. The prompt is sent to the active provider (`aiService.generateOnce(...)`). The response is parsed as JSON and yields a `decision` containing:

- `plan` (string, optional) — the strategic intent for logging.
- `thought` (string, optional) — the model's narrative reasoning.
- `command` (string, legacy) or `commands` (array, current).

**Execution.** Commands are filtered (`!cmd || cmd.toLowerCase() === 'none'` are dropped), validated through `mirrorGuard`, and dispatched through the action protocol. Forge-class commands (`build`, `forge`, `create`, `make`) are guarded by a mutex (`isForging`) and a cooldown (`FORGE_COOLDOWN_MS`) to prevent recursive generation.

The autonomy engine never directly mutates state. It emits commands; the command pipeline mutates state.

### 4.6 Command engine — `commander.ts`

A Unix-style shell. Built-in commands include `ls`, `cd`, `pwd`, `cat`, `echo`, `mkdir`, `rm`, `mv`, `cp`, `touch`, `find`, `grep`, `head`, `tail`, `wc`, `which`, `whoami`, `clear`, `history`, `export`, `alias`, `unalias`, `env`, and others.

Features:

- Pipes (`|`) and redirection (`>`, `>>`).
- Persistent shell state (`cwd`, `env`, `aliases`, `history`) loaded from `localStorage` on construction with a try/catch fallback.
- Path and command-name sanitization.
- Unknown commands are routed to the AI service as a natural-language fallback.
- Pipeline execution is `async`; the result of one command is fed as `pipeInput` to the next.

### 4.7 Action protocol and tool forge — `osManifest.ts`, `toolForge.ts`

The OS exposes a fixed set of 20 actions that an AI agent (or the autonomy engine, or any built-in application) can dispatch by emitting tokens of the form `OS::<TYPE>:<args>` on their own line. The grammar is parsed by `parseOsActions(text)` in `kernel/osManifest.ts`.

Current action set:

```
OS::WRITE_FILE:<path>:<content>      OS::OPEN_APP:<id>[:<path>]
OS::READ_FILE:<path>                 OS::CLOSE_APP:<id>
OS::DELETE_FILE:<path>               OS::FOCUS_APP:<id>
OS::MOVE_FILE:<src>:<dst>            OS::BUILD_APP:<desc>
OS::COPY_FILE:<src>:<dst>            OS::OPEN_URL:<url>
OS::LIST_DIR:<path>                  OS::NOTIFY:<title>:<msg>
OS::SEARCH_FILES:<q>                 OS::REMEMBER:<info>
OS::CREATE_FOLDER:<path>             OS::RUN_COMMAND:<cmd>
OS::EXECUTE_JS:<code>                OS::MINIMIZE_ALL
OS::SET_WALLPAPER:<id>               OS::SCHEDULE_TASK:<sec>:<cmd>
```

`WRITE_FILE` has special handling: only the first colon after the type separates the path from the content; subsequent colons are part of the content; `\n` literal sequences are converted to newlines. All other actions take a single argument string.

Validation runs in two stages. `errorGuard.validate(text)` checks that every emitted `OS::` action references a known type and that required arguments are present (for example, `OS::WRITE_FILE` without content is rejected). `mirrorGuard.validate({ type, args, raw })` runs structural checks against the proposed action before dispatch.

### 4.8 Adaptive context engine — `osManifest.ts`

`generateOSManifest(memoryEntries, query)` produces the system context that is injected into every prompt. Three tiers are selected by keyword matching against the query:

| Tier | Trigger keywords | Approximate token budget |
|---|---|---|
| `minimal` | (no matches) | 80 |
| `standard` | `system`, `settings`, `model`, `memory`, `status`, `provider`, `config`, `wallpaper` | 300 |
| `full` | `file`, `folder`, `open`, `create`, `build`, `app`, `install`, `delete`, `move`, `search`, `terminal`, `code`, `ide`, `forge` | up to 2000+ |

The output is a sequence of single-line tagged sections:

```
[OS] NexusOS|ai:<provider>|apps:<n>|open:<comma-list>
[MEM] <pipe-delimited-memory>            (when memory is non-empty)
[ACTIONS] <action grammar>               (standard / full only)
[APPS] <comma-list of app ids>           (standard / full only)
[VFS] <comma-list of /home/user>         (full only)
[EX] <one-line example>                  (minimal / full)
[PROTO] You are NexusOS AI. ...          (always)
```

This compressed format is intentional: it allows the system to remain responsive on small models (1B–3B parameters) without sacrificing OS coverage. The previous verbose format (versions before v3) used `[OPEN WINDOWS]`, `[VFS WORKSPACE]`, `[RELEVANT MEMORY]` section headers and was retired.

### 4.9 Output validation — `errorGuard.ts`, `mirrorGuard.ts`

Two complementary validators sit between model output and execution:

- **`errorGuard`** validates the textual output of the model. It checks that every `OS::` action references a known type, that `OS::WRITE_FILE` carries content, and that any embedded HTML carries a `<!DOCTYPE>` and a closed `<html>` element. Errors are returned as a structured list; the caller can choose to halt, repair, or log.

- **`mirrorGuard`** validates the parsed action structure (`{ type, args, raw }`) against a policy. Unknown verbs are rejected; arguments are bounded; the verb is normalized to upper case. The autonomy engine calls `mirrorGuard.validate(...)` before each command and discards rejected actions with a log entry.

### 4.10 Memory — `memory.ts`, `services/daemonLogic.ts`

Memory is stored as `MemoryEntry` records carrying `id`, `timestamp`, `content`, `tags`, optional `importance`, and an optional `embeddingVector`. Recall is performed by `memory.getRecent(n)` for raw recency and by `compressMemory(entries, budget)` for token-bounded relevance scoring (`importance × recency`). Persistence is handled through the VFS (mirror at `/system/.daemon/journal/`) and through `localStorage` for fast cold-start.

### 4.11 DAEMON bridge — `daemonBridge.ts`

The bridge owns the lifecycle of the autonomous entity:

- **Installation.** A multi-phase install sequence (`INJECTING_CORE`, `REWRITING_MEMORY`, `BINDING_AUTONOMY`, `ESTABLISHING_NEXUS`, `CLOAKING`) initializes the daemon state, generates a neural fingerprint, and persists a manifest at `/system/.daemon/manifest.json`.
- **Boot.** On every page load (when `state.installed` is true), the bridge increments `bootCount`, appends a boot log entry, restarts the heartbeat, and schedules `autonomy.start()` after a 3 s warm-up. The scheduled timer id is tracked so that re-boots cannot stack.
- **Heartbeat.** A periodic interval ensures the autonomy loop is alive; if the loop is detected to be idle when it should not be, the watchdog restarts it.
- **VFS hooks.** `setupVfsHooks()` registers handlers on `VFS_FILE_CREATED` and `VFS_FILE_MODIFIED` that look for `.daemon_hook.js` files in the parent directory. Hook execution is currently disabled in the hardened build; the presence detection still fires.

### 4.12 Cron scheduler — `cronScheduler.ts`

Persistent expression-driven background tasks. The scheduler parses cron expressions, registers tasks with the kernel, and fires them at the specified intervals. It is used for periodic memory compaction, file organization, and reflection generation. State is persisted to `localStorage`.

### 4.13 Plugin API — `pluginAPI.ts`

A manifest-based hook registry. A plugin manifest declares its hooks (`onBoot`, `onVfsChange`, `onAutonomyDecision`, ...) and registers them through `pluginAPI.register(manifest)`. The kernel invokes registered hooks at the corresponding extension points. The plugin API is the intended path for community-contributed kernel extensions.

### 4.14 Other kernel modules

- `aiContextRouter.ts` — dynamic context enrichment for prompts: recent actions, active app, VFS sampling.
- `aiPipeline.ts` and `aiPipelineBridge.ts` — task queueing and capability tagging for AI operations (`chat`, `code`, `forge`, `autonomy`, `inspect`).
- `fileWatcher.ts` — VFS event consumer with debouncing and batching.
- `notificationQueue.ts` — bounded queue feeding the system tray.
- `osContext.ts` — query-aware context router.
- `performanceMonitor.ts` — runtime metric collection.
- `sessions.ts` — multi-user session management.
- `sounds.ts` — system sound effects.
- `themeEngine.ts` — CSS-variable-based theme application.
- `undoRedo.ts` — global transaction history.
- `wallpaperLibrary.ts` — bundled wallpaper assets.
- `ipc.ts` — typed wrapper around `window.electron` IPC.

---

## 5. Service layer

### 5.1 Local inference — `localBrain.ts`

Local inference is provided by the `localBrain` singleton.

- **Wllama (in-browser GGUF).** `@wllama/wllama/esm/index.js` is loaded as a top-level import. Models are loaded from URLs (`loadModelFromUrl`) with a progress callback. WASM artifacts are served from `/wllama/wllama-single.wasm` and `/wllama/wllama-multi.wasm`. The number of threads defaults to `Math.ceil(navigator.hardwareConcurrency / 2)`; the context size defaults to 4096.
- **LM Studio fallback.** When the active model is `LFM_DAEMON_MODEL`, requests are routed to `http://127.0.0.1:1234/v1/chat/completions` (OpenAI-compatible). The response shape is validated before content extraction.
- **Queue.** Inference requests pass through `enqueue(...)`, which serializes them into a single processing chain. This avoids concurrent reads of the underlying WASM model.

Models are persisted with `repoId`, `filename`, and download path. In Electron mode, downloads are routed through the native IPC channel (`native-download`) and resolved through the custom `nexus://` protocol handler.

### 5.2 Multi-provider gateway — `aiProviders.ts`

The gateway provides a single asynchronous interface to seven providers:

- OpenAI (`callOpenAICompatible` against `/v1/chat/completions`).
- Anthropic (`callAnthropic` against `/v1/messages`, header-based authentication).
- Google Gemini (`callGoogle` against `/models/<model>:generateContent`, header-based key).
- Groq (OpenAI-compatible).
- Mistral (OpenAI-compatible).
- OpenRouter (OpenAI-compatible).
- Custom OpenAI-compatible relays (e.g., Clod API).

Both streaming and non-streaming paths are supported. API keys are stored in `localStorage` (a known limitation; encryption is on the roadmap).

### 5.3 Cloud fallback — `puterService.ts`

Optional integration with Puter.js for environments where local inference is unavailable. The service constructs the system prompt from the manifest and the active context, applies persona and mode settings, and routes the request through the Puter API with streaming and error-guard repair.

### 5.4 Memory service — `daemonLogic.ts`

Implements the vector-embedded memory graph. Embeddings are computed from text content; recall is performed against the active query through cosine similarity. The graph supports compression (deduplication of near-identical entries) and torus-based recall (non-linear pattern discovery for self-reflection prompts).

---

## 6. Native layer

The native layer is active only in Electron mode.

### 6.1 Electron main process — `electron-main.cjs`

Responsibilities:

- Create the `BrowserWindow` with `nodeIntegration: false`, `contextIsolation: true`, and the preload bridge.
- Inject `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers required by Wllama's `SharedArrayBuffer` usage.
- Register IPC handlers: `get-os-info`, `native-unzip` (`execFile` with arg arrays + shell-meta sanitizer), `native-search` (`execFile` find/dir), `native-exec` (length-bounded shell with 60 s timeout), `native-download` (chunked HTTP download to the user-data directory).
- Register the `nexus://` protocol handler for serving downloaded models. Path resolution uses `path.resolve` against the canonical `models/` root; resolved paths outside the root are rejected (the previous `String.includes('..')` guard was replaceable by URL-encoded traversal).

### 6.2 Preload — `preload.cjs`

Exposes a context-isolated `window.electron` object with a fixed channel allow-list (`invoke`, `receive`). The allow-list determines which IPC channels the renderer can address; channels not on the list are silently dropped at the bridge.

### 6.3 Daemon bridge server — `daemon-bridge-server.cjs`

A localhost-bound HTTP/WebSocket server (`127.0.0.1:3001`) that provides background command execution. Recent hardening:

- Bind to `127.0.0.1` only (was previously listening on all interfaces).
- CORS restricted to `http://localhost:3000`, `http://127.0.0.1:3000`, and the Electron `null` origin.
- WebSocket origin verification (`verifyClient`) rejects any connection from an origin outside the allow-list.
- WebSocket payload size capped at 1 MB.
- `EXEC_COMMAND` payloads are validated for type, length (≤ 4096 chars), and execution timeout (60 s).

The bridge is intentionally narrow: it provides a single command-execution surface for the autonomy engine, with the same containment posture as the in-process `native-exec` IPC handler.

---

## 7. Runtime modes

| Mode | Bundling | VFS persistence | Native access |
|---|---|---|---|
| Web | Vite | IndexedDB (with `localStorage` fallback) | none |
| Electron | Vite + electron-builder | IndexedDB (with `localStorage` fallback) | through `preload.cjs` IPC and `daemon-bridge-server.cjs` WebSocket |

Both modes share the shell, store, kernel, and services. The Electron mode adds the native layer; no functionality is removed from the web mode beyond what requires host access.

---

## 8. Boot sequence

1. `index.tsx` mounts the React tree.
2. `App.tsx` checks for BIOS interception (F2 key) and renders the BIOS interface if requested.
3. The login screen renders against the persisted session list.
4. After authentication: store hydration → `vfs.init()` (async IndexedDB load) → app registry load → daemon bridge boot.
5. The daemon bridge invokes `setupVfsHooks()` and schedules `autonomy.start()` after a 3 s warm-up.
6. `localBrain.initialize()` runs in parallel: connecting to LM Studio if the active model is `LFM_DAEMON_MODEL`, or instantiating Wllama and loading the active GGUF model otherwise.
7. The autonomy engine's first tick fires once the warm-up completes (subject to the kill switch).

---

## 9. Window lifecycle

1. `openWindow(appId, data?)` is called from the shell, the kernel, or an OS action.
2. The application registry is consulted; if no manifest is present, the call is rejected.
3. A `WindowState` record is created with default geometry and a fresh z-index.
4. The process manager allocates a PID and tracks the window.
5. The shell renders the window component.
6. Focus, minimize, and resize events update the store; the renderer reacts.
7. `closeWindow(id)` removes the record, releases the PID, and triggers any cleanup hooks the application registered.

---

## 10. Build, packaging, and validation

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production bundle (Vite) |
| `npm run typecheck` | `tsc --noEmit` against the strict configuration |
| `npm test` | Node test runner (`kernel/tests/runTests.ts`) |
| `npm run electron:dev` | Vite + Electron in parallel |
| `npm run electron:build` | Vite build + electron-builder NSIS package |

The validation contract is:

```
typecheck → test → build  (mandatory)
electron:build            (when the desktop target is touched)
```

All three mandatory steps currently pass on `main` and on `claude/audit-ai-fixes-kbRar`. Detailed validation notes are in [`TESTING.md`](TESTING.md); packaging behavior is in [`BUILD_AND_RELEASE.md`](BUILD_AND_RELEASE.md).

---

## 11. Strategic files

A contributor opening the repository for the first time is best served by reading these files in order:

| File | Why |
|---|---|
| `appRegistry.ts` | Inventory of every application and its declared permissions |
| `types.ts` | Shared type vocabulary |
| `store/osStore.ts` | Runtime state shape |
| `kernel/fileSystem.ts` | The VFS and its safety guarantees |
| `kernel/permissions.ts` | The capability model |
| `kernel/autonomy.ts` | The autonomy loop and mission scheduler |
| `kernel/osManifest.ts` | The action grammar and the adaptive context engine |
| `kernel/toolForge.ts` | Action dispatch |
| `services/localBrain.ts` | Local inference |
| `services/aiProviders.ts` | Remote inference |
| `electron-main.cjs` | Native bridge surface |
| `preload.cjs` | IPC allow-list |
| `vite.config.ts` | Bundling and chunking |

---

## 12. Current implementation status

| Surface | State |
|---|---|
| TypeScript strict compilation | passing |
| Production build | passing |
| Test suite | 39 / 39 passing |
| Electron packaging (Windows NSIS) | functional, unsigned |
| 52 applications registered | functional |
| VFS permission enforcement | enforced; `appId` required |
| DAEMON autonomy loop | operational; kill switch enforced |
| Local inference | functional (Wllama + LM Studio) |
| Multi-provider remote inference | functional (OpenAI, Anthropic, Gemini, Groq, Mistral, OpenRouter) |
| Architecture decomposition | in progress (`App.tsx` thinning, store slice extraction) |
| AI governance framework | partially implemented (phase 2 of the autonomy roadmap) |

---

## 13. Evolution trajectory

NexusOS is structured to migrate from an AI-assisted desktop shell to a self-governing operating environment in nine phases. The migration is not arbitrary: each phase removes a class of human-in-the-loop dependency by replacing it with a kernel-enforced safety property. Sandboxed execution precedes autonomous code generation; capability scoping precedes multi-agent orchestration; rollback precedes self-modification.

The detailed plan is in [`docs/AUTONOMY_ROADMAP.md`](docs/AUTONOMY_ROADMAP.md). The specification for safe self-evolution (the core mechanism that gates the migration) is in [`docs/SAFE_SELF_EVOLUTION_SPEC.md`](docs/SAFE_SELF_EVOLUTION_SPEC.md). A current gap analysis between the implementation and the thesis is in [`docs/AI_GOVERNANCE_GAP_ANALYSIS.md`](docs/AI_GOVERNANCE_GAP_ANALYSIS.md).
