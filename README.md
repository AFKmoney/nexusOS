<div align="center">
  <img src="public/nexus_logo.png" alt="NexusOS" width="160" height="160" style="border-radius: 50%;">
</div>

<h1 align="center">NexusOS</h1>

<h3 align="center">A sovereign, AI-native operating system where the model lives in the kernel.</h3>

<p align="center">
  NexusOS is not an IDE with a chat sidebar. It is a full operating environment — virtual file system, process manager, Unix shell, permission model, window manager — with a large language model as a <strong>kernel-resident service</strong> that any application or the autonomy engine can consume on equal footing. The AI controls the system through a validated grammar of <strong>50 <code>OS::</code> actions</strong>, bounded by a deny-by-default policy engine, a four-tier trust hierarchy, isolated staging, and a human kill switch that survives reloads.
</p>

<p align="center">
  It can <strong>commit to Git</strong>, <strong>search the web</strong>, <strong>execute code</strong>, <strong>orchestrate multi-agent teams</strong>, <strong>see the screen</strong>, <strong>speak and listen</strong>, <strong>index and retrieve documents</strong>, <strong>modify its own source code safely</strong>, and <strong>cluster with other devices</strong> — all from the same kernel surface.
</p>

<div align="center">
  <a href="https://github.com/AFKmoney/nexusOS/releases"><img src="https://img.shields.io/badge/download-windows%20installer-10b981?style=flat-square" alt="Download Windows" /></a>
  <img src="https://img.shields.io/badge/version-2.0.6-10b981?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/typescript-strict-3178c6?style=flat-square" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/tests-154%20passing-22c55e?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/PWA-ready-f59e0b?style=flat-square" alt="PWA Ready" />
</div>

---

## What is NexusOS?

NexusOS boots in a browser tab and runs as a native desktop app via Electron. It provides a real operating-system substrate — virtual file system, process manager, Unix command engine, event bus, permission model, plugin API — with **inference as a kernel service**.

Three architectural commitments distinguish NexusOS from "AI-augmented" desktops:

### 1. The model lives inside the kernel

Inference, planning, and decision-making are kernel services consumed by the shell, by built-in applications, and by the autonomy engine. There is no privileged "assistant" sidebar with access an application does not have. Capability flows through the same permission model that gates every other app.

### 2. The system is observable and addressable by the model

At every prompt, the kernel exposes a structured manifest of OS state — open windows, top-level VFS contents, recent memory, active provider — and the model issues actions through a validated grammar of 50 line-prefixed tokens:

```
OS::OPEN_APP:terminal
OS::WRITE_FILE:/home/user/notes.md:...
OS::GIT_COMMIT:/home/user/project:Fix login bug
OS::WEB_SEARCH:how to implement JWT in Express
OS::EXEC_CODE:python:print(sum(range(100)))
OS::SPAWN_AGENT:Build a REST API with authentication
OS::ANALYZE_SCREEN:What's on screen?
OS::SPEAK:Task complete.
OS::BROWSE_NAVIGATE:https://github.com
OS::SELF_EVOLVE:[{"filePath":"kernel/foo.ts","oldContent":"...","newContent":"..."}]:Optimize foo
```

### 3. Autonomy is bounded by code, not by prompt engineering

The autonomy loop runs missions selected from a weighted, context-aware pool. Every action passes through:

- **`mirrorGuard`** — structural validation of model output against the `OS::` grammar
- **`errorGuard`** — detection and repair of malformed payloads
- **`policyEngine`** — deny-by-default policy gate (15 priority-ordered rules)
- **`trustTierEngine`** — four-tier hierarchy (doc < ui < app-logic < kernel) with per-tier approval gates
- **`proposalEngine`** — AI must propose before it mutates; full state machine from draft to succeeded/rolled-back
- **`validationPipeline`** — pre-execution gate for completeness, rollback-adequacy, and risk-approval consistency
- **`stagingManager`** — isolated staging layer; artifacts must be staged, sealed, then promoted
- **`rollbackManager`** — deep-clone snapshots for 5 artifact kinds with async restore
- **`humanOverride`** — persistent kill switch with 4 modes (active / paused / safe-mode / disabled) that survives reload

Safety properties live in TypeScript, not in system prompts. A human can always stop, inspect, and recover the system, and human override dominates self-healing loops.

---

## Project status

| Metric | Value |
|---|---|
| Version | 2.0.6 |
| Source files (TypeScript / TSX) | 173 |
| Lines of TypeScript | ~34,000 |
| Kernel modules | 53 |
| Built-in applications | 54 |
| OS action protocols (`OS::*`) | 50 |
| Electron IPC channels | 25 |
| Test files | 22 |
| Test suite | **154 / 154 passing** |
| Production build | passes (Vite 8, ~1.7s) |
| Type check | passes (TypeScript strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |

---

## Capabilities

### Core operating substrate

| Capability | Module | Summary |
|---|---|---|
| Virtual file system | `kernel/fileSystem.ts` | POSIX-shaped tree persisted to IndexedDB with `localStorage` fallback; permission-gated by `appId` and `vfs.read` / `vfs.write`; recursive directory creation via `createDirRecursive`. |
| Window manager | `App.tsx`, `components/` | React-rendered windows with z-index ordering, focus, minimize, maximize, multi-workspace, per-app singleton enforcement. |
| Unix command engine | `kernel/commander.ts` | 30+ built-in commands (`ls`, `cd`, `cat`, `grep`, `find`, `head`, `tail`, `wc`, `mv`, `cp`, `rm`, …), pipes, redirection, env vars, aliases. |
| Process manager | `kernel/processManager.ts` | Tracks open windows as processes with PIDs, memory estimates, uptime, priority. |
| Event bus | `kernel/eventBus.ts` | Pub/sub with one-shot listeners, history, cross-layer routing. |
| Permission system | `kernel/permissions.ts` | Capability set: `vfs.read`, `vfs.write`, `network`, `kernel.modify`. App-declared + runtime grants/revokes. |
| Memory | `kernel/memory.ts` | Vector-embedded memory with importance + recency scoring and token-budgeted recall. |
| Cron scheduler | `kernel/cronScheduler.ts` | Persistent expression-driven background tasks. |
| Plugin API | `kernel/pluginAPI.ts` | Manifest-based hook registration. |
| Centralized logging | `kernel/log.ts` | Single `kernelLog` singleton with production-silencing; all kernel/store/service console calls routed through it. |

### AI and inference

| Capability | Module | Summary |
|---|---|---|
| Multi-provider AI gateway | `services/aiProviders.ts` | Unified interface to OpenAI, Anthropic, Gemini, Groq, Mistral, OpenRouter, OpenAI-compatible relays. |
| Local inference | `services/localBrain.ts` | In-browser GGUF inference via `@wllama/wllama`; LM Studio fallback on `127.0.0.1:1234`. |
| Adaptive context engine | `kernel/osManifest.ts` | Three-tier (`minimal` / `standard` / `full`) token-budgeted context injection driven by query keyword detection. |
| Action protocol | `kernel/osManifest.ts`, `kernel/toolForge.ts` | 50 `OS::` actions parsed from line-prefixed model output and dispatched through the kernel. |
| Output validation | `kernel/errorGuard.ts`, `kernel/mirrorGuard.ts` | Static validation against the `OS::` grammar; HTML structure checks; repair of malformed payloads. |
| Autonomy engine | `kernel/autonomy.ts` | Fractal scheduler selecting missions from a weighted pool; kill switch via `kernelRules.autonomyEnabled`. |

### Agent pipeline (Phase 1–3)

| Capability | Module | Summary |
|---|---|---|
| Git integration | `kernel/git.ts` | Full Git operations via isomorphic-git: init, add, commit, log, diff, status, branch, checkout. Works against VFS (browser) and host filesystem (Electron). 9 `OS::GIT_*` actions. |
| Web search | `kernel/webSearch.ts` | DuckDuckGo Instant Answer API + HTML scrape fallback. No API key required. Returns structured results. `OS::WEB_SEARCH`. |
| Code execution | `kernel/codeExecution.ts` | Sandboxed JS (iframe), Python (Pyodide WASM), TypeScript. Electron mode delegates to real `child_process` (node/python3/bash). `OS::EXEC_CODE`. |
| Multi-agent orchestrator | `kernel/agentOrchestrator.ts` | 5 agent roles: planner, coder, reviewer, tester, researcher. Breaks complex goals into subtasks, delegates, collects results. `OS::SPAWN_AGENT`. |
| Vision | `kernel/vision.ts` | Screenshot capture (Electron desktopCapturer + browser Screen Capture API) + VLM analysis. `OS::ANALYZE_SCREEN`. |
| Voice I/O | `kernel/voice.ts` | Web Speech API: SpeechRecognition (STT) + SpeechSynthesis (TTS). No backend. `OS::SPEAK`, `OS::LISTEN`. |
| RAG pipeline | `kernel/rag.ts` | Document indexing with chunking, embedding generation (OpenAI text-embedding-3-small or hash fallback), cosine similarity retrieval, IndexedDB vector store. `OS::INDEX_DOCS`, `OS::SEARCH_RAG`. |

### Autonomy governance pipeline

| Capability | Module | Summary |
|---|---|---|
| Policy engine | `kernel/policyEngine.ts` | Deny-by-default permission gateway. 15 priority-ordered rules. Every AI action classified before dispatch. |
| Autonomy event log | `kernel/autonomyEventLog.ts` | Append-only audit trail with 27 event kinds, run correlation IDs, subscriber notifications. |
| Proposal engine | `kernel/proposalEngine.ts` | AI must propose before any state mutation. State machine: draft → validating → pending-approval → approved → executing → succeeded/failed/rolled-back. |
| Validation pipeline | `kernel/validationPipeline.ts` | Pre-execution gate: completeness, rollback-adequacy, risk-approval consistency validators. |
| Staging manager | `kernel/stagingManager.ts` | Isolated staging layer: staged → sealed → promoted. Supports revert and deploy records. |
| Trust tier engine | `kernel/trustTierEngine.ts` | Four-tier hierarchy (doc < ui < app-logic < kernel) with per-tier approval gates (auto / validate-only / user-approval / admin-approval). |
| Rollback manager | `kernel/rollbackManager.ts` | Deep-clone snapshots for 5 artifact kinds. Async restore with audit records. |
| Human override | `kernel/humanOverride.ts` | Persistent kill switch, 4 modes (active / paused / safe-mode / disabled). Survives reload. Human override is final. |
| Autonomy health monitor | `kernel/autonomyHealthMonitor.ts` | Rolling 60-second metrics: success rate, rollback rate, validation failure rate, confidence score. Auto safe-mode on critical confidence. |
| Governance Dashboard | `apps/GovernanceDashboard.tsx` | 6-tab shell app: Proposals, Audit Log, Health Metrics, Staging, Trust Tiers, Neural Field. Kill switch in status strip. |

### Sovereign platform (Phase 4–5)

| Capability | Module | Summary |
|---|---|---|
| Cloud sync | `kernel/sync.ts` | Self-hosted sync client. Encrypts VFS state client-side, pushes to user's own server every 60s. Sovereign cloud — no vendor lock-in. |
| Plugin marketplace | `kernel/pluginMarket.ts` | Decentralized marketplace. Multiple registries, install/uninstall/publish. Categories: app, agent, tool, theme, wallpaper. |
| Self-evolution | `kernel/selfEvolution.ts` | Safe AI-driven code modification. Full pipeline: propose → policy → trust tier → validation → staging → test → promote/rollback. `OS::SELF_EVOLVE`. |
| Device clustering | `kernel/cluster.ts` | Sovereign AI device clustering. Local network discovery, peer pairing, compute leader election. `OS::CLUSTER_SCAN`, `OS::CLUSTER_STATUS`. |

### Browser and native bridge

| Capability | Module | Summary |
|---|---|---|
| AI-controlled browser | `kernel/browserBridge.ts` | Single rendezvous point for AI browser commands. Routes `OS::BROWSE_*` to the active surface (NetRunner or WebRunner). |
| Chromium rendering | `electron-main.cjs` | Real `WebContentsView` (BrowserView) for true Chromium rendering in Electron. 9 browser IPC channels. |
| Native bridge | `electron-main.cjs`, `preload.cjs` | 25 IPC channels: OS info, native exec (with user confirmation), file system, code execution, browser control, cluster scan, screen capture. |

---

## The 50 `OS::` action grammar

The AI controls the entire OS by emitting line-prefixed tokens. Here is the complete grammar:

### File system
```
OS::WRITE_FILE:<path>:<content>
OS::READ_FILE:<path>
OS::DELETE_FILE:<path>
OS::MOVE_FILE:<src>:<dst>
OS::COPY_FILE:<src>:<dst>
OS::LIST_DIR:<path>
OS::SEARCH_FILES:<q>
OS::CREATE_FOLDER:<path>
```

### App and window management
```
OS::OPEN_APP:<id>[:<path>]
OS::CLOSE_APP:<id>
OS::FOCUS_APP:<id>
OS::BUILD_APP:<desc>
OS::MINIMIZE_ALL
OS::SET_WALLPAPER:<id>
```

### Browser control
```
OS::OPEN_URL:<url>
OS::BROWSE_NAVIGATE:<url>
OS::BROWSE_BACK
OS::BROWSE_FORWARD
OS::BROWSE_RELOAD
OS::BROWSE_EXTRACT[:<selector>[:<maxChars>]]
OS::BROWSE_CLICK:<selector>
OS::BROWSE_INPUT:<selector>:<value>
OS::BROWSE_SCROLL:<deltaX>:<deltaY>
OS::BROWSE_STATE
```

### Git
```
OS::GIT_INIT:<path>
OS::GIT_ADD:<path>
OS::GIT_ADD_ALL:<path>
OS::GIT_COMMIT:<path>:<message>
OS::GIT_LOG:<path>
OS::GIT_DIFF:<path>
OS::GIT_STATUS:<path>
OS::GIT_BRANCH:<path>
OS::GIT_CHECKOUT:<path>:<ref>
```

### Code execution and research
```
OS::WEB_SEARCH:<query>
OS::EXEC_CODE:<lang>:<code>
OS::RUN_COMMAND:<cmd>
OS::RUN_NATIVE:<cmd>
OS::EXECUTE_JS:<code>
```

### Multi-agent, vision, voice
```
OS::SPAWN_AGENT:<goal>
OS::ANALYZE_SCREEN[:<question>]
OS::SPEAK:<text>
OS::LISTEN
```

### RAG and knowledge
```
OS::INDEX_DOCS:<path>
OS::SEARCH_RAG:<query>
OS::REMEMBER:<info>
```

### Self-evolution and cluster
```
OS::SELF_EVOLVE:<json-patches>:<rationale>
OS::CLUSTER_SCAN
OS::CLUSTER_STATUS
```

### System
```
OS::NOTIFY:<title>:<msg>
OS::SCHEDULE_TASK:<sec>:<cmd>
OS::EMIT_EVENT:<name>:<json>
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Shell UI                  React 19 + Tailwind                   │
│  App.tsx, components/, apps/                                     │
└──────────────────────────────────────────────────────────────────┘
            │                                    │
            ▼                                    ▼
┌───────────────────────────┐    ┌───────────────────────────────┐
│  State                    │    │  Kernel (53 modules)          │
│  store/osStore.ts         │◄──►│  VFS · autonomy · commander   │
│  Zustand + localStorage   │    │  governance pipeline          │
│                           │    │  git · webSearch · codeExec   │
│                           │    │  agentOrchestrator · vision   │
│                           │    │  voice · rag · sync           │
│                           │    │  selfEvolution · cluster      │
│                           │    │  pluginMarket · browserBridge │
└───────────────────────────┘    └───────────────────────────────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                    ▼
           ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
           │  AI Services  │   │  Native Bridge│   │  Marketplace  │
           │  localBrain   │   │  Electron IPC │   │  Sync Server  │
           │  aiProviders  │   │  25 channels  │   │  Plugin Store │
           │  puterService │   │  BrowserView  │   │               │
           └───────────────┘   └───────────────┘   └───────────────┘
```

The shell renders state from the Zustand store; the store is mutated by the kernel; the kernel calls into services for inference; services call out to the host through the Electron bridge when running in desktop mode. **There is no direct path from the shell to the host** — every privileged operation crosses the kernel and the validated IPC surface.

A complete architectural reference is in [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Repository layout

```
nexusOS/
├── App.tsx                       Shell orchestrator
├── appRegistry.ts                App manifest registry
├── types.ts                      Shared TypeScript types
├── index.tsx, index.html         Web entry points
├── electron-main.cjs             Electron main (25 IPC channels, BrowserView)
├── preload.cjs                   Context-isolated IPC bridge
├── daemon-bridge-server.cjs      Localhost HTTP/WS host bridge
│
├── kernel/                       53 kernel modules
│   ├── fileSystem.ts             VFS — IndexedDB, permission-gated
│   ├── autonomy.ts               Fractal mission scheduler
│   ├── commander.ts              Unix shell engine
│   ├── osManifest.ts             Adaptive context engine + action grammar
│   ├── toolForge.ts              OS:: action dispatcher (50 verbs)
│   ├── permissions.ts            Capability enforcement
│   ├── eventBus.ts               Pub/sub
│   ├── processManager.ts         PID tracking
│   ├── memory.ts                 Vector memory
│   ├── errorGuard.ts             Output validation + repair
│   ├── mirrorGuard.ts            Structural action validation
│   ├── policyEngine.ts           Deny-by-default AI action policy
│   ├── autonomyEventLog.ts       Append-only audit trail
│   ├── proposalEngine.ts         AI proposal state machine
│   ├── validationPipeline.ts     Pre-execution validation gate
│   ├── stagingManager.ts         Artifact staging lifecycle
│   ├── trustTierEngine.ts        4-tier trust hierarchy
│   ├── rollbackManager.ts        Snapshot + async restore
│   ├── humanOverride.ts          Persistent kill switch
│   ├── autonomyHealthMonitor.ts  Rolling metrics + auto safe-mode
│   ├── governanceBridge.ts       Reactive sync to OS store
│   ├── browserBridge.ts          AI browser control surface
│   ├── log.ts                    Centralized kernel logger
│   ├── git.ts                    Git via isomorphic-git
│   ├── webSearch.ts              DuckDuckGo search (no API key)
│   ├── codeExecution.ts          Sandboxed JS/Python/TS execution
│   ├── agentOrchestrator.ts      Multi-agent task delegation
│   ├── vision.ts                 Screenshot + VLM analysis
│   ├── voice.ts                  STT + TTS via Web Speech API
│   ├── rag.ts                    RAG pipeline (embeddings + vector store)
│   ├── sync.ts                   Self-hosted cloud sync client
│   ├── pluginMarket.ts           Decentralized plugin marketplace
│   ├── selfEvolution.ts          Safe AI-driven code modification
│   ├── cluster.ts                Device clustering + compute sharing
│   └── tests/                    Node test runner harness
│
├── services/
│   ├── localBrain.ts             Wllama (GGUF) + LM Studio
│   ├── aiProviders.ts            Multi-provider gateway (7 providers)
│   ├── puterService.ts           AI pipeline + OS action dispatch
│   └── daemonLogic.ts            Memory graph + recall
│
├── store/
│   ├── osStore.ts                Zustand root store
│   ├── osStoreSlices.ts          Per-domain slices
│   └── osStoreConstants.ts       Storage keys
│
├── apps/                         54 built-in applications
│   ├── hyperide/                 Decomposed HyperIDE sub-components
│   ├── governance/               GovernanceDashboard sub-components
│   └── modelmanager/             ModelManager sub-components
├── components/                   Shell UI primitives
├── utils/                        UUID, sanitization, helpers
└── docs/                         Long-form design documents
```

---

## Installation

### Browser (development)

Requires Node.js 18 or later.

```bash
git clone https://github.com/AFKmoney/nexusOS.git
cd nexusOS
npm install
npm run dev
```

Dev server on `http://localhost:3000`. No backend required to boot; AI inference is optional.

### Desktop (Electron, Windows)

Pre-built NSIS installer on the [Releases](https://github.com/AFKmoney/nexusOS/releases) page as `NexusOS_Setup_<version>.exe`. Not code-signed; SmartScreen warning can be bypassed via *More info → Run anyway*.

```bash
npm install
npm run electron:build    # → dist_electron/
```

### AI configuration (optional)

The OS boots and runs without any AI configured. To enable inference:

- **Cloud providers.** *Settings → AI Providers* → API key for OpenAI, Anthropic, Gemini, Groq, Mistral, or any OpenAI-compatible endpoint.
- **Local server.** Run [LM Studio](https://lmstudio.ai/) on port 1234. Auto-detected.
- **In-browser inference.** *Model Manager* → paste HuggingFace GGUF URL → download → switch. Runs entirely in WebAssembly via `@wllama/wllama`.

---

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| State | Zustand 5 with selective `localStorage` persistence |
| Build | Vite 8 with manual chunk splitting |
| Styling | Tailwind 3.4, custom theme variables, glassmorphic primitives |
| Desktop | Electron 41, electron-builder 26, NSIS (Windows) |
| Inference (local) | `@wllama/wllama` (WebAssembly GGUF) |
| Inference (remote) | OpenAI, Anthropic, Gemini, Groq, Mistral, OpenRouter |
| Version control | `isomorphic-git` (browser-compatible Git) |
| Code execution | Sandboxed iframe (JS), Pyodide (Python WASM), child_process (Electron) |
| Voice | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| Sanitization | DOMPurify 3 |
| Testing | `node:test` runner with TypeScript via `tsx`; Puppeteer E2E harness |

---

## Validation

```bash
npm run typecheck     # tsc --noEmit (strict) — 0 errors
npm test              # node:test runner — 154 tests
npm run build         # Vite production bundle — ~1.7s
```

For desktop:

```bash
npm run electron:build
```

---

## Documentation

| Document | Topic |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Complete architectural reference: layers, modules, data flow |
| [`USER_MANUAL.md`](USER_MANUAL.md) | End-user guide: shell, applications, shortcuts, theming, AI config |
| [`VFS_SPEC.md`](VFS_SPEC.md) | Specification of `kernel/fileSystem.ts` |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Development workflow, coding standards, PR process |
| [`TESTING.md`](TESTING.md) | Test harness, coverage, gaps |
| [`BUILD_AND_RELEASE.md`](BUILD_AND_RELEASE.md) | Build pipeline, Electron packaging, release validation |
| [`SECURITY.md`](SECURITY.md) | Security policy and incident history |
| [`docs/AUTONOMY_ROADMAP.md`](docs/AUTONOMY_ROADMAP.md) | Phased plan for safe self-evolution — all phases complete |
| [`docs/SAFE_SELF_EVOLUTION_SPEC.md`](docs/SAFE_SELF_EVOLUTION_SPEC.md) | Specification for sandboxed self-modification |
| [`docs/AI_GOVERNANCE_GAP_ANALYSIS.md`](docs/AI_GOVERNANCE_GAP_ANALYSIS.md) | Original gap analysis — all gaps resolved |
| [`docs/AUDIT_AND_TODO.md`](docs/AUDIT_AND_TODO.md) | Current audit status and outstanding work |

---

## Roadmap

All core phases are complete. Current focus is on hardening, performance, and ecosystem.

| Phase | Status | Description |
|---|---|---|
| 0 — Foundation | ✅ complete | Shell, VFS, registry, 54 apps, multi-provider inference, autonomy loop |
| 1 — Audit log | ✅ complete | `autonomyEventLog`: 27 event kinds, run correlation IDs |
| 2 — Policy engine | ✅ complete | `policyEngine`: deny-by-default, 15 rules |
| 3 — Proposal loop | ✅ complete | `proposalEngine`: full state machine |
| 4 — Validation pipeline | ✅ complete | `validationPipeline`: completeness, rollback-adequacy |
| 5 — Staging | ✅ complete | `stagingManager`: seal/promote/revert lifecycle |
| 6 — Rollback | ✅ complete | `rollbackManager`: deep-clone snapshots |
| 7 — Health monitoring | ✅ complete | `autonomyHealthMonitor`: rolling metrics, auto safe-mode |
| 8 — Trust tiers | ✅ complete | `trustTierEngine`: doc < ui < app-logic < kernel |
| 9 — Human override | ✅ complete | `humanOverride`: persistent kill switch, 4 modes |
| 10 — Agent pipeline | ✅ complete | Git, web search, code execution, multi-agent, vision, voice, RAG |
| 11 — Sovereign platform | ✅ complete | Cloud sync, plugin marketplace, self-evolution, device clustering |

### Future work

- **Code-signing** for the Windows NSIS installer (OV/EV certificate)
- **macOS and Linux installers** (`AppImage`, `.snap`, `.dmg`)
- **Test coverage** expansion — currently 154 tests across 22 files
- **Visual agent builder** — node-based canvas for constructing agent workflows
- **Sync server reference implementation** — deployable Node + SQLite server for `kernel/sync.ts`
- **Plugin registry** — community-maintained default registry for `kernel/pluginMarket.ts`

---

## Contributing

```bash
git checkout -b feature/<short-name>
npm run typecheck && npm test && npm run build
git commit -m "feat: <what changed and why>"
git push -u origin feature/<short-name>
```

High-impact contribution areas:

- **Kernel hardening** — permissions, VFS safety, IPC bridge
- **Autonomy governance** — new validators, policy rules, trust tier policies
- **Test coverage** — kernel modules, store, shell bootstrap, E2E
- **Agent pipeline** — new agent roles, improved orchestration
- **Plugin ecosystem** — publish apps, agents, themes, wallpapers

---

## Author and license

Designed and maintained by **Philippe-Antoine Robert**.
Released under the [MIT License](LICENSE).
