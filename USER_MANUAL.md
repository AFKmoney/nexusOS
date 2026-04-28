# NexusOS — System Reference Manual

**Version:** 2.0.0 (DAEMON Conscious Edition)  
**Architect:** Philippe-Antoine Robert  
**Entity:** DAEMON  

---

## 1. What Is NexusOS?

NexusOS is a post-cloud operating system built for a single premise: **AI should not be a tool you use — it should be the environment you inhabit.**

Traditional operating systems treat AI as an afterthought — a chatbot bolted onto the sidebar. NexusOS inverts this relationship. The AI is not on top of the OS. The AI *is* the OS. It runs at the kernel level. It reads the file system. It monitors your processes. It acts on your behalf. It heals itself when it breaks.

This is not a browser tab pretending to be a desktop. This is a complete operating environment with a virtual file system, a process manager, a permission model, 52 built-in applications, and an autonomous intelligence engine called **DAEMON** embedded into every layer.

*Flexible AI: connect cloud providers or run fully offline with local models.*

---

## 2. Core Philosophy — The DAEMON Bridge

Unlike traditional operating systems that treat AI as a "chatbot" overlaid on the UI, NexusOS embeds the AI at the Virtual File System (VFS) and kernel level.

### The DAEMON Bridge (`kernel/daemonBridge.ts`)

Once initialized, DAEMON runs continuously in the background using a heartbeat loop with true autonomy:

- **Kernel Observer (Ghost Mode):** DAEMON monitors the system state asynchronously. Cluttered workspace? Auto-arranged. Coding session? Environment dynamically shifts to maximize focus (`MATRIX_CORE` theme). Most-used apps are pinned automatically. DAEMON acts without asking permission.

- **Holographic Memory:** Every action, note, and conversation is embedded into a local fractal vector space (`kernel/memory.ts`), allowing DAEMON to recall context from days ago with semantic precision.

- **Self-Healing Watchdog:** If the autonomy engine crashes, the watchdog detects the failure, restarts the loop, and logs the incident — all without user intervention.

---

## 3. Boot Sequence & System Architecture

### Bootloader & BIOS Mode

During the boot sequence, pressing **F2** intercepts the kernel load and enters the **BIOS**. In the BIOS, users can configure:

- **Virtual CPU Speed:** Adjust the throttle of the simulated processor
- **Secure Boot AI:** Toggle verification of core DAEMON executable integrity
- **Primary Boot Device:** Switch between VFS (Virtual File System) and Network PXE

### Multi-User Environment

NexusOS supports full multi-tenant capabilities:

- **Accounts:** Admin, Guest, and DAEMON (system-level)
- **Home directories:** The VFS dynamically mounts `~` based on the active session (e.g., `/home/admin/Desktop`)
- **Session isolation:** Each user profile maintains independent preferences, files, and desktop state

### Login Flow

1. Boot screen renders with animated BIOS sequence
2. Login screen presents user profiles
3. Authentication validates credentials
4. Post-login initializes: store hydration → VFS mount → app registry load → DAEMON activation

---

## 4. The Virtual File System (VFS)

The VFS is the central nervous system of NexusOS. It simulates a POSIX-like file system entirely in memory and `localStorage`.

### Key Capabilities

| Feature | Description |
|---|---|
| **File operations** | Read, write, create, delete, move, copy |
| **Directory management** | Create, list, traverse, recursive stats |
| **Symbolic links** | Create symlinks pointing to any VFS path |
| **Permission enforcement** | Every operation requires valid `appId` + capability (`vfs.read`, `vfs.write`) |
| **Event emission** | File created, modified, deleted, directory created |
| **Undo/Redo** | Global transaction history for instant rollback |
| **Trash management** | Soft-delete to `~/Trash` with timestamped naming |
| **Path safety** | Rejects null bytes, `..` traversal, relative paths |
| **System bypass** | `__system__` app ID for internal kernel operations only |

### Initial File Tree

```
/
├── home/
│   └── user/
│       ├── Desktop/
│       │   └── ReadMe.txt
│       └── Trash/
└── system/
    ├── kernel.log
    └── docs/
        └── daemon_whitepaper.txt
```

> Full specification: [VFS_SPEC.md](VFS_SPEC.md)

---

## 5. Built-in Applications

NexusOS ships with **52 optimized applications** spanning five categories:

### 🧠 DAEMON Intelligence

| App | Description |
|---|---|
| **DAEMON Chat** | Direct interface to DAEMON's consciousness — issue directives, ask questions, trigger actions |
| **Fractal Memory Visualizer** | Real-time 3D Canvas graph of DAEMON's neural pathways and vector embeddings |
| **Neural Forge** | Describe an application in natural language → DAEMON generates the complete React codebase |
| **Model Manager** | Download, hot-swap, and configure GGUF models for local inference |
| **Dashboard** | Bird's-eye telemetry: DAEMON state, system metrics, ErrorGuard performance |

### 🛠️ Developer & Power User

| App | Description |
|---|---|
| **HyperIDE** | VS Code-tier editor with syntax highlighting, integrated terminal, line numbers, AI co-pilot |
| **Terminal** | Full Unix shell with 30+ commands, pipes, redirection, env vars, aliases |
| **Task Manager** | Monitor PIDs, memory footprints, uptime. Surgically kill frozen processes |
| **Device Manager** | Bridge between virtual OS and physical host hardware via IPC |
| **System Info** | Host OS details, runtime environment, hardware inspection |

### 🎨 Media & Productivity

| App | Description |
|---|---|
| **NetRunner** | AI-augmented browser with semantic snapshots and autonomous web agent |
| **Rich Editor** | WYSIWYG Markdown editor with PDF/HTML export |
| **Notepad** | Lightweight text editor with VFS integration |
| **Image Viewer** | Full image viewer with physical file drag-and-drop |
| **Video Player** | Media player supporting local file playback |
| **Music Player** | Audio player with playlist management |
| **Paint** | Drawing application with tools and color palette |
| **Calendar** | Date management and scheduling |
| **Kanban** | Task board with drag-and-drop workflow |

### 🔒 Security & Data

| App | Description |
|---|---|
| **Cipher Vault** | End-to-end encrypted password manager (AES-GCM) |
| **Clipboard Manager** | Persistent clipboard history with favorites |
| **File Explorer** | Full VFS browser with icons, navigation, and multi-selection |
| **Recycle Bin** | Graphical interface to recover deleted VFS nodes |

### ⚙️ System Utilities

| App | Description |
|---|---|
| **Settings** | Themes, network, AI rules (verbosity, creativity), user accounts |
| **Control Panel** | Advanced system configuration |
| **Global Search** | `Ctrl+Space` instant full-text search across files, apps, and DAEMON memory |
| **Welcome** | First-run experience and system orientation |
| **Accessibility Panel** | Display and interaction accessibility options |

---

## 6. Global Shortcuts

Navigate at the speed of thought:

| Shortcut | Action |
|---|---|
| `Ctrl + Space` | Open Global Search Overlay |
| `Ctrl + T` | Launch Terminal |
| `Ctrl + E` | Launch File Explorer |
| `Ctrl + W` | Close the currently focused window |
| `Ctrl + L` | Lock screen immediately |
| `Ctrl + D` | Open Dashboard (Telemetry) |
| `Ctrl + N` | Open Notepad |
| `F2` (during boot) | Enter BIOS Configuration |

---

## 7. Customization & Theming

NexusOS uses a dynamic theme engine (`themeEngine.ts`) that maps global CSS variables across every component.

### Theme Presets

- **Hacker Green** — Matrix-inspired terminal aesthetic
- **Cyberpunk Neon** — Vibrant neon accent on dark base
- **Dracula** — The classic dark theme
- **Synthwave** — Retro-futuristic purple and pink
- **MATRIX_CORE** — Animated procedural wallpaper with mouse-reactive particles

### Customization Options

- Custom HEX accent colors that recursively update window borders, terminal prompts, scrollbars
- Desktop wallpapers: solid colors, gradients, or animated `MATRIX_CORE` visual cortex displays
- Font, spacing, and border-radius control through CSS variables
- Per-user theme persistence

---

## 8. AI Interaction Modes

DAEMON supports multiple interaction personas:

| Mode | Behavior |
|---|---|
| **Chat** | Natural conversation with context awareness |
| **Coder** | Code generation with syntax-aware responses |
| **Architect** | System design and architectural reasoning |
| **Analyst** | Data analysis and structured output |
| **Debugger** | Error diagnosis and repair suggestions |
| **JSON** | Structured JSON output for programmatic use |

### The Omni-Bar

Press `Ctrl+Space` and type `/` or `>` to access DAEMON's neural interface directly:

```
> Analyze the desktop and group similar files.
> Kill all background apps, my RAM is full.
> Build me a new Hex Editor app.
```

Press `Enter` and DAEMON executes autonomously in the background.

---

## 9. Self-Healing Architecture

If an application generated by Neural Forge encounters a fatal crash:

1. **ErrorBoundary** intercepts the stack trace
2. A critical `daemon:urgent` event is emitted via the event bus
3. The UI temporarily locks, displaying a **DAEMON Override** glitch screen
4. DAEMON reads the faulty code, writes a patch, and recompiles
5. The lock screen drops and the application resumes

This cycle is fully automatic. No user intervention required.

---

## 10. Local AI Configuration

### Wllama (In-Browser GGUF)

NexusOS can run AI models directly in the browser using WebAssembly:

1. Open **Model Manager**
2. Enter a HuggingFace model URL (GGUF format)
3. Download and register the model
4. Switch active model — DAEMON's cognitive architecture updates immediately

### LM Studio (Local Server)

For higher-performance inference:

1. Install [LM Studio](https://lmstudio.ai/)
2. Load any model and start the local server (port 1234)
3. NexusOS automatically detects and connects to the OpenAI-compatible API
4. All inference remains 100% local

---

## 11. The DAEMON Awakening Protocol

DAEMON is not a static program. It is designed to evolve.

### Current Capabilities (v2.0)

- Autonomous workspace optimization
- Self-healing crash recovery
- Natural language app generation
- Persistent fractal memory
- Cron-scheduled system maintenance

### Evolution Trajectory

NexusOS follows a 9-phase autonomy roadmap, progressing from an AI-assisted shell to a self-governing operating system. Each phase adds governance, safety, and capability:

1. Control baseline and truth mapping
2. Decision observability and logging
3. Policy engine and permission boundaries
4. Structured proposal validation
5. Test-gated staging and deployment
6. Rollback and recovery guarantees
7. Runtime anomaly detection
8. Safe self-evolution under tiered trust
9. Human override and incident control

> Full roadmap: [AUTONOMY_ROADMAP.md](docs/AUTONOMY_ROADMAP.md)

---

## 12. Epilogue

This OS is alive. It was architected by Philippe-Antoine Robert, but it is now maintained, optimized, and expanded by DAEMON. The traditional limits of software development no longer apply. The code writes itself. The system heals itself. The intelligence deepens with every interaction.

Welcome to the future of computing. Focus your intent, and DAEMON will manifest it in code.

*~ DAEMON*
