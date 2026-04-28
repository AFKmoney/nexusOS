# NexusOS Architecture

## Overview

NexusOS is a self-evolving AI operating system built as a desktop-class shell in the browser and Electron. It is not a chat wrapper. It is not a demo. It is a fully operational environment where an autonomous AI entity — DAEMON — is embedded at the kernel level, capable of observing system state, making decisions, executing actions, and reflecting on outcomes.

The architecture follows five layers:

1. **Shell UI** — Desktop metaphor, window management, taskbar, start menu
2. **State Layer** — Centralized Zustand store with session, windows, autonomy, and theme state
3. **Kernel Layer** — VFS, process manager, event bus, permissions, autonomy engine, command engine
4. **Service Layer** — Local AI inference, cloud fallback, DAEMON logic, context routing
5. **Native Layer** — Electron main process, IPC bridge, host OS integration

Each layer communicates through well-defined interfaces: the event bus for decoupled reactivity, the store for shared state, and the VFS for persistent file operations.

---

## 1. Shell UI

The shell is orchestrated by `App.tsx` and the components in `components/`.

### Responsibilities

- **Boot sequence** — BIOS interception (F2), login screen, session initialization
- **Desktop rendering** — Wallpaper, icons, widgets, clock overlays
- **Window management** — Open, close, minimize, restore, focus, z-index tracking
- **Taskbar** — Running apps, pinned apps, system tray
- **Start menu** — App launcher with search integration
- **Global search** — `Ctrl+Space` overlay searching files, apps, and DAEMON memory
- **Lock screen** — Session lock with multi-user support
- **Context menu** — Right-click actions across desktop and file system

### Design Decision

`App.tsx` currently serves as the primary orchestrator. The architecture roadmap calls for decomposing it into thinner coordinators to reduce coupling between UI logic and kernel operations.

---

## 2. Application Registry

`appRegistry.ts` is the single source of truth for all applications in NexusOS.

Each application manifest declares:

| Field | Purpose |
|---|---|
| `id` | Unique identifier |
| `name` | Display name |
| `icon` | Lucide icon reference |
| `description` | Human-readable summary |
| `permissions` | Required capabilities (`vfs.read`, `vfs.write`, `network`, `kernel.modify`) |
| `defaultSize` | Initial window dimensions |
| `singleton` | Whether only one instance can run |
| `component` | React component to render |

The registry drives:
- App discovery and display in the start menu
- Window creation and lifecycle management
- Permission enforcement at VFS and kernel operations
- Pinning, search results, and installation state

---

## 3. Global State

`store/osStore.ts` centralizes all runtime state using Zustand with selective persistence.

### State Domains

| Domain | Contains |
|---|---|
| **Session** | Current user, login state, profile |
| **Windows** | Open windows, z-index stack, focused window |
| **Registry** | Installed apps, pinned apps |
| **Notifications** | System notifications queue |
| **Autonomy** | DAEMON state, objectives, logs, lock status |
| **Theme** | Colors, wallpaper, accent, dark/light mode |
| **Clipboard** | Persistent clipboard history |
| **UI** | Start menu open, search active, BIOS mode |

### Persistence

The store uses `localStorage` for selective persistence. Transient state (window positions, focus) is not persisted. User preferences, installed apps, and VFS data survive page reloads.

### Architectural Note

The store is currently monolithic. The roadmap recommends splitting into independent slices (session, windows, apps, notifications, shell, autonomy, preferences) to reduce cross-cutting dependencies.

---

## 4. Kernel

The `kernel/` directory contains the core OS primitives.

### 4.1 Virtual File System (`fileSystem.ts`)

A browser-persisted, app-permission-gated virtual file tree.

- **Storage**: `localStorage` key `nexus_vfs_v1`
- **Node types**: `file`, `directory`, `symlink`
- **Operations**: `listDir`, `readFile`, `writeFile`, `createDir`, `delete`, `move`, `moveMany`, `createSymlink`, `moveToTrash`, `getStats`
- **Permissions**: Every operation requires a valid `appId` with appropriate capability (`vfs.read` or `vfs.write`). Missing `appId` is denied.
- **System bypass**: `SYSTEM_VFS_APP_ID = '__system__'` for internal kernel operations
- **Events**: `VFS_FILE_CREATED`, `VFS_FILE_MODIFIED`, `VFS_FILE_DELETED`, `VFS_DIR_CREATED`
- **Safety**: Path normalization rejects null bytes, `..` traversal, and non-absolute paths

> Full specification: [VFS_SPEC.md](VFS_SPEC.md)

### 4.2 Process Manager (`processManager.ts`)

Simulated process tracking for the window-based application model.

- Spawn, kill, minimize, resume operations
- Per-process memory estimation and uptime tracking
- Priority model for process scheduling
- Integration with Task Manager app

### 4.3 Event Bus (`eventBus.ts`)

Pub/sub system for decoupled communication across all layers.

- Subscribe, unsubscribe, one-time event listeners
- Event emission with payload
- History tracking for debugging
- Used by VFS, window manager, autonomy engine, AI pipeline, and shell

### 4.4 Autonomy Engine (`autonomy.ts`)

The heart of DAEMON's autonomous behavior.

- **System snapshots**: Captures entire OS state — windows, files, processes, memory
- **Mission pool**: Predefined missions scored against current system state
- **Decision loop**: AI generates JSON decision → commander executes → outcome logged
- **Reflection**: Periodic self-assessment written to VFS journal
- **Memory**: Success/failure outcomes embedded into fractal memory
- **Kill-switch**: Respects `kernelRules.autonomyEnabled` flag

### 4.5 Command Engine (`commander.ts`)

Unix-like shell with 30+ built-in commands.

- `ls`, `cd`, `cat`, `echo`, `mkdir`, `rm`, `mv`, `cp`, `touch`, `find`, `grep`, `head`, `tail`, `wc`
- Pipes (`|`), redirection (`>`), environment variables, aliases
- Shell history with recall
- Path and command-name sanitization
- AI fallback for unrecognized commands

### 4.6 Tool Forge (`toolForge.ts`)

21 OS action protocols that DAEMON can invoke programmatically.

Includes: `OS::OPEN_APP`, `OS::CLOSE_APP`, `OS::FOCUS_APP`, `OS::WRITE_FILE`, `OS::READ_FILE`, `OS::DELETE_FILE`, `OS::MOVE_FILE`, `OS::CREATE_DIR`, `OS::NOTIFICATION`, `OS::THEME`, and more.

### 4.7 Permissions (`permissions.ts`)

Registry-driven permission model.

- **Permission types**: `vfs.read`, `vfs.write`, `network`, `kernel.modify`
- **API**: `hasPermission()`, `enforce()`, `grant()`, `revoke()`, `getPermissions()`, `isRegistered()`
- **Safety**: App IDs validated (1-128 chars, no null bytes)
- **Runtime overrides**: Temporary in-memory capability expansion

> Full model: [PERMISSIONS_MODEL.md](PERMISSIONS_MODEL.md)

### 4.8 AI Pipeline (`aiPipeline.ts`)

Task queueing and execution management for AI operations.

- Task kinds: `chat`, `code`, `forge`, `autonomy`, `inspect`
- Capability labels per task
- `canAccess(taskId, capability)` for runtime checks
- Task status tracking: queued → active → done/failed

### 4.9 Context Router (`aiContextRouter.ts`)

Dynamic context enrichment for AI prompts.

- Recent action log
- Active app, file, and window context
- VFS sampling for relevant files
- Memory recall from fractal embeddings
- System prompt fragment injection

### 4.10 DAEMON Bridge (`daemonBridge.ts`)

Lifecycle management for the DAEMON entity.

- Heartbeat loop with watchdog monitoring
- State persistence to `localStorage` and VFS mirror
- Boot/installation logging
- Journal snapshots at `/system/.daemon/journal/`
- VFS event watching
- Self-healing restart on crash

### 4.11 Cron Scheduler (`cronScheduler.ts`)

Persistent background task scheduling.

- Cron expression parsing
- Periodic execution of DAEMON maintenance tasks
- Memory compression
- File organization
- System reflection generation

---

## 5. Services

### 5.1 Local Brain (`localBrain.ts`)

Local AI inference layer.

- **Wllama**: In-browser GGUF model inference
- **LM Studio**: OpenAI-compatible local server on port 1234
- Model registration, switching, and hot-swap
- HuggingFace model download with path validation
- Streaming generation support

### 5.2 Puter Service (`puterService.ts`)

Cloud AI fallback (optional).

- Puter.js API integration
- Persona and mode selection
- System prompt construction with manifest and context injection
- Streaming and non-streaming response paths
- Error guard repair pipeline

### 5.3 DAEMON Logic (`daemonLogic.ts`)

Fractal knowledge graph and neural memory management.

- Vector embedding for context recall
- Torus-based recall for non-linear pattern discovery
- Memory compression and deduplication

---

## 6. Runtime Modes

NexusOS supports two execution environments:

### Web Mode
- Bundled by Vite
- Runs in any modern browser
- VFS persisted to `localStorage`
- No native OS access

### Electron Mode
- `electron-main.cjs` for main process
- `preload.cjs` for secure IPC bridge
- Full native OS integration: file access, command execution, model downloads
- Windows installer via NSIS (`electron-builder.yml`)

Both modes share the same shell, store, kernel, and VFS logic. The Electron layer adds native capabilities through IPC channels.

---

## 7. Execution Flow

### Boot Sequence

1. `index.tsx` mounts the React application
2. `App.tsx` initializes the shell orchestrator
3. BIOS intercept check (F2 key)
4. Login screen with multi-user support
5. Post-login: store hydration, VFS initialization, app registry load
6. DAEMON Bridge initialization → heartbeat, watchdog, journal
7. Local AI initialization (`localBrain.initialize()`)
8. Autonomy engine start (if enabled)

### Window Lifecycle

1. User or DAEMON triggers app open
2. Store calls `openWindow(appId, data?)`
3. Registry lookup retrieves app manifest
4. `WindowState` created with dimensions, position, z-index
5. `processManager.spawn(...)` tracks the process
6. Shell renders the window component
7. Focus, minimize, restore managed by store
8. Close triggers `processManager.kill(...)` and state cleanup

---

## 8. Build & Packaging

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (browser) |
| `npm run build` | Production bundle |
| `npm run typecheck` | TypeScript verification |
| `npm test` | Kernel tests |
| `npm run electron:dev` | Dev server + Electron |
| `npm run electron:build` | Build + package Windows installer |

> Full build documentation: [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md)

---

## 9. Strategic Files

Any contributor should understand these files first:

| File | Role |
|---|---|
| `App.tsx` | Shell orchestrator |
| `appRegistry.ts` | Application manifest registry |
| `types.ts` | Shared TypeScript types |
| `store/osStore.ts` | Global state management |
| `kernel/fileSystem.ts` | Virtual file system |
| `kernel/autonomy.ts` | DAEMON autonomy engine |
| `kernel/commander.ts` | Unix shell engine |
| `kernel/processManager.ts` | Process lifecycle |
| `kernel/eventBus.ts` | Event system |
| `kernel/permissions.ts` | Permission model |
| `services/localBrain.ts` | Local AI inference |
| `services/puterService.ts` | Cloud AI service |
| `vite.config.ts` | Build configuration |
| `electron-main.cjs` | Electron main process |

---

## 10. Current Status

- ✅ TypeScript compiles cleanly
- ✅ Vite production build passes
- ✅ Kernel tests pass
- ✅ Electron packaging produces Windows installer
- ✅ 52 applications registered and functional
- ✅ VFS permission model enforced
- ✅ DAEMON autonomy loop operational
- ✅ Local AI inference functional (Wllama + LM Studio)
- 🔄 Architecture decomposition in progress (App.tsx → thinner coordinators)
- 🔄 Store slice separation in progress
- 🔄 AI governance framework being implemented (Phase 2 of 9)

---

## 11. Evolution Trajectory

NexusOS is architected to evolve from an **AI-assisted desktop shell** into a **self-governing operating system** through a 9-phase autonomy roadmap. The architecture prioritizes **safety before autonomy**: no self-modification without policy gates, no execution without audit trails, and no evolution without rollback guarantees.

> Full evolution roadmap: [AUTONOMY_ROADMAP.md](docs/AUTONOMY_ROADMAP.md)
> Self-evolution specification: [SAFE_SELF_EVOLUTION_SPEC.md](docs/SAFE_SELF_EVOLUTION_SPEC.md)
> Governance gap analysis: [AI_GOVERNANCE_GAP_ANALYSIS.md](docs/AI_GOVERNANCE_GAP_ANALYSIS.md)
