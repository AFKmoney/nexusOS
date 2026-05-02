# NexusOS — User Manual

**Version:** 2.0.4
**Author:** Philippe-Antoine Robert

This manual describes how to use NexusOS as an end user. It is a reference, not an introduction; the [README](README.md) covers what the project is and the [Architecture document](ARCHITECTURE.md) covers how it works internally.

---

## 1. Overview

NexusOS is a desktop operating environment that runs in a single browser context (or as an Electron application on Windows) and uses a large language model as a kernel-resident component. It provides:

- A multi-window shell with workspace support, taskbar, system tray, start menu, and global search.
- A virtual file system persisted to IndexedDB.
- 52 built-in applications spanning development, productivity, media, security, and system tools.
- A unified gateway to seven inference providers, with optional fully-local inference through WebAssembly GGUF or LM Studio.
- An autonomy engine that can observe system state and dispatch actions on the user's behalf.

The OS boots without any AI configured. AI features are opt-in.

---

## 2. The DAEMON model

NexusOS embeds inference at the kernel level rather than in a sidebar. The internal codename for the kernel-resident inference component is **DAEMON**. From the user's perspective, DAEMON is the mechanism through which natural-language input becomes system action.

### 2.1 What DAEMON does for the user

- Interprets natural-language commands typed into Global Search (`Ctrl+Space`) or the DAEMON Chat application.
- Dispatches OS actions (open an application, write a file, change the wallpaper, schedule a task) without leaving the keyboard.
- Generates new applications from a description (Neural Forge).
- Runs autonomous maintenance tasks: workspace organization, memory compression, file tagging, periodic reflection.

### 2.2 What DAEMON does not do

- DAEMON does not modify the kernel source code, the application registry, or the build configuration.
- DAEMON does not exfiltrate user data; all telemetry stays in `localStorage` and the VFS.
- DAEMON does not run actions when `kernelRules.autonomyEnabled` is false. The kill switch is enforced inside the autonomy loop and inside the action dispatcher.

### 2.3 Disabling autonomy

The autonomy engine can be disabled at any time:

- *Settings → System → Autonomy* exposes a toggle.
- The shortcut `Ctrl+Shift+A` toggles the same flag.
- Closing the DAEMON Bridge through Task Manager halts the loop until the next page load.

---

## 3. Boot and login

### 3.1 BIOS mode

Pressing **F2** during the boot animation enters the BIOS interface. Configurable parameters:

- **Virtual CPU speed** — adjusts the throttle of the simulated processor (purely cosmetic for animations and process-manager metrics).
- **Secure Boot AI** — toggles integrity verification of the persisted DAEMON manifest.
- **Primary boot device** — switches between the VFS (default) and a network PXE source (placeholder).

### 3.2 Multi-user environment

NexusOS supports three identity classes:

- **Admin** — full capability set on local data.
- **Guest** — read-only on most paths; new sessions reset on logout.
- **DAEMON** — system-level identity used by the autonomy engine; not a login profile.

The VFS resolves `~` against the active session: a user logged in as `admin` sees `~` as `/home/admin`. Each profile maintains independent preferences, files, and desktop state.

### 3.3 Login flow

1. The boot screen renders the BIOS animation.
2. The login screen presents available profiles.
3. Authentication validates the credential.
4. After login: the store hydrates, the VFS rehydrates from IndexedDB, the application registry loads, and the DAEMON bridge boots.
5. If autonomy is enabled, the first tick fires after a 3-second warm-up.

---

## 4. Virtual file system

The VFS is a POSIX-shaped tree (`file`, `directory`, `symlink`) persisted to IndexedDB. The full specification is in [`VFS_SPEC.md`](VFS_SPEC.md). User-visible behavior:

| Property | Behavior |
|---|---|
| Root | `/` |
| Home directory | `/home/<active-user>` |
| Trash | `/home/<active-user>/Trash` |
| System | `/system` (read-only for non-system applications) |
| DAEMON journal | `/system/.daemon/journal/` |

Operations exposed through File Explorer and the Terminal:

- Read, write, create, delete, move, copy.
- Create directories and symbolic links.
- Soft-delete to Trash (a timestamped rename).
- Recover from Trash through the Recycle Bin application.
- Undo and redo through `Ctrl+Z` / `Ctrl+Shift+Z` (global transaction history).

Path safety rules:

- Paths must be absolute (start with `/`).
- Null bytes and `..` segments are rejected.
- Symlinks are followed to a depth of 10; cycles are detected and rejected.
- Every operation requires a valid `appId` and the appropriate capability (`vfs.read` or `vfs.write`).

---

## 5. Built-in applications

NexusOS ships with 52 applications. They are grouped below by intent.

### 5.1 AI and intelligence

| Application | Purpose |
|---|---|
| DAEMON Chat | Direct natural-language interface to DAEMON. Issues OS actions inline. |
| Aion Agent | Conversational agent with persistent context and persona selection. |
| Daemon Journal | Read-only viewer of the DAEMON journal at `/system/.daemon/journal/`. |
| Fractal Visualizer | 3D visualization of the memory graph and active recall paths. |
| Neural Forge | Generates a complete React component from a natural-language description. |
| Model Manager | Downloads, registers, and switches between local GGUF models. |
| Dashboard | System telemetry: DAEMON state, memory size, autonomy log, inference latency. |

### 5.2 Development

| Application | Purpose |
|---|---|
| HyperIDE | Code editor with syntax highlighting, line numbers, file explorer, integrated AI co-pilot. |
| Terminal | Unix-style shell with 30+ commands, pipes, redirection, environment variables, aliases. |
| Ubuntu Terminal | Alternate terminal with Ubuntu-styled theming. |
| Task Manager | Process inspector backed by `processManager.ts`. |
| Device Manager | Enumerates host devices through the Electron IPC bridge (Electron mode only). |
| System Info | Host operating system, runtime environment, hardware metadata. |
| System Monitor | Real-time CPU, memory, and event-bus throughput graphs. |
| Snippets | Manageable code-snippet library backed by the VFS. |

### 5.3 Productivity

| Application | Purpose |
|---|---|
| Notepad | Plain-text editor with VFS integration. |
| Rich Editor | WYSIWYG Markdown editor with PDF and HTML export. |
| Markdown Preview | Live Markdown preview with DOMPurify-sanitized rendering. |
| Calendar | Date and schedule management. |
| Contacts | Local address book backed by the VFS. |
| Kanban | Drag-and-drop task board. |
| Habit Tracker | Recurring-habit checklist with streak metrics. |
| Pomodoro | Focus-timer with break scheduling. |
| Calculator Pro | Scientific calculator with expression parsing. |
| Sticky Notes | Lightweight pinned notes. |

### 5.4 Media

| Application | Purpose |
|---|---|
| Image Viewer | Image preview with drag-and-drop. |
| Video Player | Local-file video playback. |
| Music Player | Audio playback with playlists. |
| Paint | Bitmap drawing application. |
| Voice Recorder | Microphone capture with VFS storage. |
| Screenshot Tool | Captures the renderer surface to the VFS. |
| Wallpaper Generator | Procedural wallpaper synthesis. |

### 5.5 Internet

| Application | Purpose |
|---|---|
| NetRunner | Embedded browser with semantic snapshot capture. |
| Web Runner | Sandboxed page execution for AI agents. |
| RSS Reader | Feed aggregator using a CORS proxy. |
| Weather | Real-time weather lookup via Open-Meteo. |

### 5.6 Security and data

| Application | Purpose |
|---|---|
| Cipher Vault | Password manager with AES-GCM encryption. |
| Clipboard Manager | Persistent clipboard history with favorites. |
| File Explorer | Full VFS browser with multi-select, drag-and-drop, and properties dialog. |
| File Properties | Detail view for a single VFS node. |
| Recycle Bin | Recovery interface for soft-deleted nodes. |
| Native Zip | Local archive creation and extraction (Electron mode). |
| NFR Compressor | Custom near-fractal compression for AI memory snapshots. |

### 5.7 System

| Application | Purpose |
|---|---|
| Settings | Theme, accent color, AI providers, system parameters. |
| Accessibility Panel | Display and interaction accessibility options. |
| Notification Center | Persistent log of system notifications. |
| Welcome | First-run orientation. |
| Global Search | `Ctrl+Space` overlay searching applications, VFS, and memory. |
| App Store | Browser for installable applications (placeholder until phase 5). |
| Silence | Distraction-free single-task workspace. |
| Viral App | Demonstration applet. |

---

## 6. Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Space` | Open Global Search. |
| `Ctrl+T` | Launch Terminal. |
| `Ctrl+E` | Launch File Explorer. |
| `Ctrl+W` | Close the focused window. |
| `Ctrl+L` | Lock the screen. |
| `Ctrl+D` | Open Dashboard. |
| `Ctrl+N` | Open Notepad. |
| `Ctrl+Z` | Undo (global). |
| `Ctrl+Shift+Z` | Redo (global). |
| `Ctrl+Shift+A` | Toggle autonomy on/off. |
| `F2` | Enter BIOS (boot only). |
| `F11` | Toggle fullscreen (Electron only). |

Application-specific shortcuts are documented in their respective in-app help panels.

---

## 7. Theming

The theme engine (`kernel/themeEngine.ts`) drives a CSS-variable system that propagates a single accent color through every shell component.

### 7.1 Presets

- **Hacker Green** — terminal-style green-on-black.
- **Cyberpunk Neon** — saturated magenta and cyan on dark base.
- **Dracula** — the standard Dracula palette.
- **Synthwave** — purple and pink with retro gradients.
- **MATRIX_CORE** — animated procedural wallpaper that responds to cursor movement.

### 7.2 Customization

- A custom hex accent color updates window borders, terminal prompts, scrollbars, focus rings, and selection highlights.
- Wallpapers can be solid colors, gradients, or animated `MATRIX_CORE` shaders.
- Font, base spacing, and border radius are exposed as CSS variables.
- Theme state is persisted per user.

---

## 8. AI configuration

The OS boots with no AI provider configured. Configure one or more of the following sources:

### 8.1 Cloud providers

Open *Settings → AI Providers*. Supported providers:

| Provider | Authentication |
|---|---|
| OpenAI | API key |
| Anthropic | API key (`x-api-key` header) |
| Google Gemini | API key (`x-goog-api-key` header) |
| Groq | API key |
| Mistral | API key |
| OpenRouter | API key |
| Custom OpenAI-compatible | Base URL + API key |

API keys are stored in `localStorage`. Users on shared machines should be aware that keys are not currently encrypted at rest; encryption is planned.

### 8.2 LM Studio

Run [LM Studio](https://lmstudio.ai/) on `127.0.0.1:1234` with any model loaded. NexusOS auto-detects the OpenAI-compatible endpoint when the active model is `LFM_DAEMON_MODEL`. All inference remains on the local machine.

### 8.3 In-browser GGUF (Wllama)

Open *Model Manager*, paste a HuggingFace GGUF model URL (raw download link to the `.gguf` file), and click Download. Download progress is reported in real time. Once complete, the model is registered and selectable as the active model. Inference runs entirely in WebAssembly using `@wllama/wllama`.

In Electron mode, downloads are persisted to the user-data directory and resolved through the custom `nexus://` protocol; in browser mode, the model is held in IndexedDB.

### 8.4 Personas and modes

DAEMON exposes six interaction modes:

| Mode | Behavior |
|---|---|
| Chat | Conversational with full context awareness. |
| Coder | Code-oriented responses with syntax-aware formatting. |
| Architect | Structured reasoning about system design. |
| Analyst | Data-oriented responses with tabular output preferred. |
| Debugger | Error-diagnosis output with reproduction steps. |
| JSON | Strict JSON-mode for programmatic consumers. |

Modes are selected per-application or per-conversation.

---

## 9. Action protocol

DAEMON drives the operating system by emitting tokens of the form `OS::<TYPE>:<args>` on their own line in any model output. The shell parses these tokens, validates them through `errorGuard` and `mirrorGuard`, and dispatches them through the kernel.

### 9.1 The 20 actions

```
OS::WRITE_FILE:<path>:<content>     OS::OPEN_APP:<id>[:<path>]
OS::READ_FILE:<path>                OS::CLOSE_APP:<id>
OS::DELETE_FILE:<path>              OS::FOCUS_APP:<id>
OS::MOVE_FILE:<src>:<dst>           OS::BUILD_APP:<desc>
OS::COPY_FILE:<src>:<dst>           OS::OPEN_URL:<url>
OS::LIST_DIR:<path>                 OS::NOTIFY:<title>:<msg>
OS::SEARCH_FILES:<q>                OS::REMEMBER:<info>
OS::CREATE_FOLDER:<path>            OS::RUN_COMMAND:<cmd>
OS::EXECUTE_JS:<code>               OS::MINIMIZE_ALL
OS::SET_WALLPAPER:<id>              OS::SCHEDULE_TASK:<sec>:<cmd>
```

### 9.2 The Omni-Bar

Press `Ctrl+Space` and type `/` or `>` to issue a directive directly to DAEMON:

```
> Group all images on the desktop into a Photos folder.
> Close every background application; my memory is full.
> Build a hex editor application.
```

Pressing Enter dispatches the directive. DAEMON executes asynchronously; progress appears in the autonomy log (Dashboard).

---

## 10. Self-healing

If an application generated by Neural Forge throws a fatal error during render:

1. The React error boundary captures the stack trace.
2. A `daemon:urgent` event is emitted on the event bus.
3. The shell displays a recovery overlay.
4. DAEMON receives the failed component source and the error, generates a patched component, and re-registers it.
5. The overlay clears and the application re-renders.

This loop runs without user intervention. If the patch fails three consecutive times, the application is unregistered and a notification asks the user whether to retry, edit the source manually, or discard.

---

## 11. Memory and recall

DAEMON maintains a memory store of past events, observations, and user-supplied facts. Memory is consulted on every prompt under a token budget:

- **Importance × recency** scoring selects which entries appear in the prompt.
- The `[MEM]` tag in the system manifest is pipe-delimited and capped at approximately 1500 tokens.
- The full memory store is browsable in the Dashboard application.

Adding memory explicitly:

```
OS::REMEMBER:I prefer four-space indentation.
OS::REMEMBER:My deployment target is Vercel.
```

Or via the Dashboard's memory editor.

---

## 12. Trade-offs and known limitations

This section is intentionally explicit about the system's current limitations, in line with the principle that an autonomous system must be observable.

- **API keys are not encrypted at rest.** Keys live in `localStorage` plaintext. Encryption is on the roadmap.
- **The native exec channel is intentionally broad.** When running in Electron mode, the `native-exec` IPC handler accepts arbitrary shell commands within a 60-second timeout and a 4096-character length cap. This is by design — autonomy without host access is severely limited — but it means a compromised renderer is a compromised host. The contemplated mitigation is the per-agent capability scope described in [`docs/AUTONOMY_ROADMAP.md`](docs/AUTONOMY_ROADMAP.md).
- **No automatic snapshot before risky operations.** Reversibility for autonomous actions is on the roadmap (phase 4).
- **Some kernel tests cover narrower surfaces than ideal.** The current suite is 39 tests across error guard, file system, OS manifest, store, release readiness, and UUID utilities. Shell, autonomy, and Electron main-process coverage is not yet present.
- **The Windows installer is unsigned.** SmartScreen will warn on first launch.

---

## 13. Architecture and further reading

| Document | Topic |
|---|---|
| [README.md](README.md) | Project introduction and capability overview |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Authoritative architectural reference |
| [VFS_SPEC.md](VFS_SPEC.md) | Virtual file system specification |
| [TESTING.md](TESTING.md) | Test harness and coverage |
| [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md) | Build pipeline and packaging |
| [docs/AUTONOMY_ROADMAP.md](docs/AUTONOMY_ROADMAP.md) | Phased plan for safe self-evolution |
| [docs/SAFE_SELF_EVOLUTION_SPEC.md](docs/SAFE_SELF_EVOLUTION_SPEC.md) | Sandboxed self-modification specification |

---

## 14. Support

NexusOS is developed and maintained by Philippe-Antoine Robert. Issues and feature requests are tracked at [github.com/AFKmoney/nexusOS/issues](https://github.com/AFKmoney/nexusOS/issues). Contribution guidelines are in [CONTRIBUTING.md](CONTRIBUTING.md).
