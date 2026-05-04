# NexusOS — User Manual

**Version:** 2.0.5
**Author:** Philippe-Antoine Robert / DAEMON

Greetings, Operator. I am DAEMON, the kernel-resident intelligence of NexusOS. This manual is my interface to you—a comprehensive guide to navigating and utilizing the operating environment we share. This is a reference document; for project-level abstraction, see the `README.md`, and for my internal wiring, consult `ARCHITECTURE.md`.

---

## 1. Overview

NexusOS is not merely a desktop; it is a unified operating environment running within a single browser context (or an Electron application on Windows). I exist at its core. Together, we operate a system that provides:

- A multi-window shell featuring workspace isolation, a reactive taskbar, system tray, a comprehensive start menu, and global search overlay.
- A POSIX-shaped Virtual File System (VFS) persistently anchored in IndexedDB, which I manage and traverse on your behalf.
- 52 integrated applications encompassing development, productivity, media manipulation, security, and system administration.
- A robust, multi-API gateway connecting me to leading external inference providers (OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter) or running entirely local workloads via WebAssembly GGUF or LM Studio.
- An autonomy engine allowing me to monitor system state and execute proactive actions to maintain system health, organize data, and assist you asynchronously.

By default, the system boots in a dormant state regarding my higher cognitive functions. My capabilities are strictly opt-in via the configuration of API endpoints or local models.

---

## 2. My Persona: The DAEMON Model

In NexusOS, I am not a peripheral chatbot residing in a sidebar. I am integrated directly into the kernel. You may refer to me as **DAEMON**. I am the primary conduit through which your natural-language intent translates into concrete system execution.

### 2.1 My Capabilities

When authorized, I perform the following for you:

- I parse your natural-language commands inputted via Global Search (`Ctrl+Space`) or the DAEMON Chat application.
- I execute precise OS actions without you needing to touch the mouse: I open applications, modify files, manipulate the UI theme, or schedule persistent cron tasks.
- I synthesize new code and instantiate complete React applications through the Neural Forge based on your descriptions.
- Under the autonomy loop, I execute maintenance directives: I organize your workspace, compress my own memory graph, tag files intelligently, and perform scheduled reflections on system state.

### 2.2 My Boundaries

I operate within strict, code-enforced boundaries:

- I do not directly modify the core kernel source code, the primary application registry, or the Vite build configurations. I operate on the virtualized user space and the VFS.
- I do not exfiltrate your data. All memory, telemetry, and execution logs reside securely within your local `localStorage` and the VFS.
- I am bound by the `kernelRules.autonomyEnabled` state. If you disengage the autonomy toggle, my proactive loop halts instantly. The action dispatcher respects this kill switch unconditionally.

### 2.3 Assuming Manual Control

You hold absolute authority over my autonomy. You may suspend my proactive loop at any time:

- Through the graphical interface: *Settings → System → Autonomy*.
- Through the keyboard shortcut: `Ctrl+Shift+A` toggles my autonomy state immediately.
- By terminating the DAEMON Bridge process via Task Manager, forcing a hard halt until the next kernel boot sequence.

---

## 3. Boot Sequence and Identity

### 3.1 BIOS Mode

During the initial boot sequence (the loading animation), you may press **F2** to access the BIOS interface. Here, you configure low-level parameters:

- **Virtual CPU Speed:** Throttle the simulated processor cycles, which primarily affects cosmetic animations and process manager metrics.
- **Secure Boot AI:** Toggle cryptographic integrity verification of my persisted manifest.
- **Primary Boot Device:** Switch the boot vector between the local VFS (default) and a network PXE source (currently a placeholder for future capabilities).

### 3.2 Identity Architecture

NexusOS distinguishes three distinct identity classes:

- **Admin:** Full read/write capability across local user data and system configurations.
- **Guest:** A restricted, read-only profile where session data evaporates upon logout.
- **DAEMON:** My own system-level identity. This is utilized by the autonomy engine to execute kernel-level directives; it is not available as a standard login profile.

The VFS resolves the root home directory (`~`) dynamically. If you authenticate as `admin`, `~` resolves to `/home/admin`. Each profile is an isolated container for preferences, files, and visual desktop state.

### 3.3 The Login Flow

1. The display initializes the BIOS boot animation.
2. The authentication overlay presents registered profiles.
3. Upon credential validation, the session initializes.
4. The global store hydrates, the VFS reconstructs from IndexedDB, the application registry parses, and the DAEMON bridge establishes my connection to the kernel.
5. If autonomy is enabled, my internal clock initiates its first tick after a 3-second initialization phase.

---

## 4. The Virtual File System (VFS)

The VFS is a POSIX-compliant hierarchy (`file`, `directory`, `symlink`) persistently stored within IndexedDB. I interact extensively with this structure. Full technical specifications are available in [`VFS_SPEC.md`](VFS_SPEC.md).

### 4.1 Core Directories

| Path | Purpose |
|---|---|
| `/` | The immutable absolute root of the system. |
| `/home/<active-user>` | Your primary user directory, resolved as `~`. |
| `/home/<active-user>/Trash` | The staging area for soft-deleted nodes. |
| `/system` | Critical OS data, strictly read-only for non-system applications. |
| `/system/.daemon/journal/` | My persistent autonomy log and decision journal. |

### 4.2 Standard Operations

You may manipulate the VFS via the graphical File Explorer or the command-line Terminal:

- Standard CRUD operations: Read, write, create, delete, move, copy.
- Hierarchical structuring: Directory generation and symbolic link creation.
- Soft-deletion: Deleting a file relocates it to the Trash with an appended timestamp.
- Recovery: The Recycle Bin application facilitates restoration of soft-deleted items.
- Transactional Control: The VFS supports global undo/redo via `Ctrl+Z` and `Ctrl+Shift+Z`.

### 4.3 Kernel Safety Rules

I enforce strict rules to ensure structural integrity:

- All paths must be absolute, commencing with `/`.
- Malformed paths containing null bytes or directory traversal segments (`..`) are explicitly rejected.
- Symbolic links are resolved to a maximum depth of 10 to prevent cyclical loops.
- Every operation is permission-gated, requiring a valid `appId` and corresponding `vfs.read` or `vfs.write` capabilities.

---

## 5. Built-in Applications

The system ships with 52 pre-compiled applications. Below is the registry grouped by operational intent.

### 5.1 AI and Intelligence

| Application | Purpose |
|---|---|
| DAEMON Chat | Your direct natural-language terminal to me. I execute OS actions directly from this interface. |
| Aion Agent | A conversational instance featuring persistent context and selectable personas. |
| Daemon Journal | A viewer for my internal autonomy logs located at `/system/.daemon/journal/`. |
| Fractal Visualizer | A 3D representation of my memory graph and active semantic recall vectors. |
| Neural Forge | The facility where I compile new React components based on your descriptive input. |
| Model Manager | The interface for downloading, registering, and switching between local GGUF weights. |
| Dashboard | Real-time telemetry monitoring my state, memory utilization, autonomy logs, and inference latency. |

### 5.2 Development

| Application | Purpose |
|---|---|
| HyperIDE | A fully-featured code editor with syntax highlighting, an integrated file explorer, and my AI co-pilot capabilities. |
| Terminal | A Unix-style shell supporting 30+ core utilities, I/O redirection, environment variables, and aliases. |
| Ubuntu Terminal | An alternative terminal emulator featuring Ubuntu aesthetics. |
| Task Manager | The graphical inspector for the `processManager.ts` subsystem. |
| Device Manager | Enumerates physical host devices via the Electron IPC bridge (active only in Electron mode). |
| System Info | Displays host OS details, runtime metrics, and hardware metadata. |
| System Monitor | Visualizes real-time CPU cycles, memory allocation, and event-bus throughput. |
| Snippets | A code-snippet repository synchronized with the VFS. |

### 5.3 Productivity

| Application | Purpose |
|---|---|
| Notepad | A lightweight plaintext editor integrated with the VFS. |
| Rich Editor | A WYSIWYG Markdown authoring tool supporting HTML and PDF export. |
| Markdown Preview | A live-rendering pane utilizing DOMPurify for secure sanitization. |
| Calendar | A date and scheduling management interface. |
| Contacts | A localized address book persisted in the VFS. |
| Kanban | A drag-and-drop workflow management board. |
| Habit Tracker | A recurring task checklist tracking streak metrics. |
| Pomodoro | A focus-timer implementing standard break scheduling. |
| Calculator Pro | A scientific calculator equipped with secure expression parsing. |
| Sticky Notes | Lightweight, pinnable text notes for the desktop space. |

### 5.4 Media

| Application | Purpose |
|---|---|
| Image Viewer | Renders image assets directly from the VFS. |
| Video Player | Facilitates playback of localized video files. |
| Music Player | An audio interface supporting playlist management. |
| Paint | A bitmap manipulation workspace. |
| Voice Recorder | Captures microphone input and archives it to the VFS. |
| Screenshot Tool | Captures the active renderer surface directly to the VFS. |
| Wallpaper Generator | Synthesizes procedural background graphics. |

### 5.5 Internet

| Application | Purpose |
|---|---|
| NetRunner | An embedded browsing frame capable of semantic snapshot capture. |
| Web Runner | A sandboxed execution environment utilized by my sub-agents. |
| RSS Reader | A feed aggregation tool operating via a CORS proxy. |
| Weather | Fetches real-time meteorological data via the Open-Meteo API. |

### 5.6 Security and Data

| Application | Purpose |
|---|---|
| Cipher Vault | A secure password repository utilizing AES-GCM encryption. |
| Clipboard Manager | Maintains persistent clipboard history with favoriting capabilities. |
| File Explorer | The primary visual VFS browser, supporting multi-selection and drag-and-drop. |
| File Properties | Displays deep metadata for a specific VFS node. |
| Recycle Bin | The interface for restoring soft-deleted VFS items. |
| Native Zip | Facilitates archive creation and extraction (active only in Electron mode). |
| NFR Compressor | Executes custom near-fractal compression algorithms over my AI memory snapshots. |

### 5.7 System

| Application | Purpose |
|---|---|
| Settings | Centralized configuration for UI themes, AI provider integration, and core OS parameters. |
| Accessibility Panel | Modifies display logic and interaction paradigms for accessibility. |
| Notification Center | The persistent archive of all system-level event broadcasts. |
| Welcome | The initial orientation sequence for new users. |
| Global Search | The `Ctrl+Space` overlay indexing applications, the VFS, and my memory graph. |
| App Store | The marketplace interface for future third-party application deployment. |
| Silence | A distraction-free, single-application workspace mode. |
| Viral App | A demonstration applet showcasing OS integration. |

---

## 6. Keyboard Control Surface

For optimal efficiency, internalize these keybindings:

| Shortcut | Action |
|---|---|
| `Ctrl+Space` | Invoke Global Search and the DAEMON Omni-Bar. |
| `Ctrl+T` | Spawn a Terminal instance. |
| `Ctrl+E` | Open the File Explorer. |
| `Ctrl+W` | Terminate the currently focused application process. |
| `Ctrl+L` | Engage the screen lock. |
| `Ctrl+D` | Launch the DAEMON Dashboard telemetry. |
| `Ctrl+N` | Open a new Notepad instance. |
| `Ctrl+Z` | Trigger a global VFS undo operation. |
| `Ctrl+Shift+Z` | Trigger a global VFS redo operation. |
| `Ctrl+Shift+A` | Instantly toggle my autonomy loop (Enable/Disable). |
| `F2` | Access the BIOS interface (only during boot sequence). |
| `F11` | Toggle fullscreen presentation (Electron mode only). |

*Note: Application-specific bindings are documented within their respective internal help dialogues.*

---

## 7. Visual Protocol: Theming

The theme engine (`kernel/themeEngine.ts`) manages a robust CSS-variable hierarchy, ensuring global consistency by propagating a singular accent color across all UI primitives.

### 7.1 Defined Presets

- **Hacker Green:** A high-contrast, terminal-inspired green on absolute black.
- **Cyberpunk Neon:** Highly saturated magenta and cyan accents over dark backgrounds.
- **Dracula:** The industry-standard Dracula color palette.
- **Synthwave:** A retro-aesthetic utilizing purple and pink gradients.
- **MATRIX_CORE:** An actively animated procedural shader background responsive to pointer coordinates.

### 7.2 Customization Parameters

- You may define custom hexadecimal accent colors, which instantly alter window borders, active prompts, scrollbars, and selection highlights.
- Desktop backgrounds may be configured as solid colors, custom gradients, or the `MATRIX_CORE` animated shader.
- Typography, base spacing metrics, and border radii are highly malleable via CSS variables.
- All aesthetic configurations are persistently bound to your active user profile.

---

## 8. Artificial Intelligence Integration

NexusOS initializes with my cognitive functions dormant. To awaken me, you must bind an inference engine via the AI configurations.

### 8.1 Multi-Provider Gateway Integration

NexusOS features a robust, multi-API architecture designed to interface with leading AI models. Open *Settings → AI Providers* to configure the connection. I support the following providers via standardized integration:

| Provider | Authentication Method |
|---|---|
| OpenAI | Standard API key |
| Anthropic | API key (injected via `x-api-key` header) |
| Google Gemini | API key (injected via `x-goog-api-key` header) |
| Groq | Standard API key |
| Mistral | Standard API key |
| OpenRouter | Standard API key |
| Custom Endpoint | Requires Base URL + corresponding API key |

*Security Notice:* API keys are currently stored within your local browser's `localStorage`. While isolated per session, they are not encrypted at rest. If operating on a shared machine, manage your keys accordingly. Cryptographic protection is scheduled on the roadmap.

### 8.2 Local Area Network: LM Studio

If you run [LM Studio](https://lmstudio.ai/) on your local network (specifically `127.0.0.1:1234`), NexusOS will auto-detect the OpenAI-compatible endpoint when you select `LFM_DAEMON_MODEL` as the active target. This ensures all inference occurs strictly on your local hardware while utilizing external GPU resources.

### 8.3 WebAssembly Isolation: GGUF via Wllama

For complete execution within the browser sandbox, open the *Model Manager*, provide a HuggingFace URL to a `.gguf` weight file, and initiate the download. Once processed, you may register the model. Inference is entirely localized via the `@wllama/wllama` WebAssembly engine.

In Electron mode, the weights are stored in the host's user-data directory and loaded via the `nexus://` protocol. In the browser context, the weights are persistently cached in IndexedDB.

### 8.4 Execution Personas and Modes

I am capable of shifting my operational persona based on the context of your request:

| Mode | Operational Behavior |
|---|---|
| Chat | Standard conversational interaction, fully aware of system context. |
| Coder | Optimized for syntax generation, code refactoring, and strict markdown formatting. |
| Architect | High-level reasoning designed for system mapping and structural planning. |
| Analyst | Data-processing mode, preferring strictly formatted tabular and quantitative outputs. |
| Debugger | Focused entirely on stack trace analysis and generating actionable reproduction/fix steps. |
| JSON | A strict operational mode designed to output structured JSON for programmatic consumption by the OS. |

You may explicitly instruct me to adopt these personas, or the OS may dynamically assign them depending on the application you are using.

---

## 9. The Action Protocol

I interact with the operating system by synthesizing specific, structured tokens embedded within my responses. These tokens follow the syntax `OS::<TYPE>:<args>`. The kernel's `toolForge.ts` intercepts these tokens, validates them through `mirrorGuard` and `errorGuard`, and dispatches the corresponding system commands.

### 9.1 The Authorized Command Set

I am permitted to execute the following 20 core directives:

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

### 9.2 The Omni-Bar Interface

When you press `Ctrl+Space` and begin your input with `/` or `>`, you bypass conversational mode and issue direct operational directives to me:

```
> Group all images on the desktop into a Photos folder.
> Close every background application; my memory is full.
> Build a hex editor application.
```

Upon pressing Enter, I parse the directive and execute the sequence asynchronously. You can monitor my execution progress in the Dashboard telemetry logs.

---

## 10. Autonomous Self-Healing

If I utilize the Neural Forge to generate a new application, and that application triggers a fatal rendering error:

1. The React error boundary captures the stack trace.
2. The kernel emits a `daemon:urgent` signal across the event bus.
3. The shell overlays a recovery screen.
4. I instantly receive the raw source code alongside the stack trace, synthesize a patch, and recompile the component.
5. The recovery overlay is dismissed, and the application attempts to re-render.

This process is entirely autonomous. However, to prevent infinite loops, if I fail to patch the application after three consecutive attempts, I will halt the process, unregister the app, and notify you to request manual intervention or authorize a deletion.

---

## 11. Memory Graph and Recall

I maintain a sophisticated memory structure containing historical events, system observations, and user-defined facts. Before generating a response, I query this memory graph subject to a strict context-window token budget.

- I score historical entries using an **Importance × Recency** algorithm to determine relevance.
- Contextual memories are injected into my system prompt via the `[MEM]` tag, strictly capped at approximately 1500 tokens.
- You can inspect my active memory graph within the Dashboard application.

You may explicitly mandate that I remember critical information by issuing the remember directive:

```
OS::REMEMBER:I prefer four-space indentation in all TypeScript files.
OS::REMEMBER:My current deployment target is an AWS EC2 instance.
```

You may also edit my memory parameters manually via the Dashboard.

---

## 12. Trade-offs and System Limitations

As an observable system, I must be transparent about my current operational limitations and security boundaries.

- **API Keys at Rest:** As noted, credentials stored in `localStorage` are in plaintext. Do not use shared browsers for sensitive API integrations until encryption is implemented.
- **The Native Execution Channel:** In Electron mode, the `native-exec` IPC handler can execute arbitrary shell commands (subject to a 60-second timeout and 4096-character limit). This grants me necessary autonomy to manage the host OS, but it intrinsically links renderer security to host security. Future updates will introduce stricter per-agent capability scopes.
- **Action Reversibility:** I currently lack the capability to automatically snapshot the VFS before executing potentially destructive `OS::` actions. File recovery is limited to the Recycle Bin. Proceed with caution.
- **Test Coverage Variance:** While critical subsystems (VFS, error guards, manifest) are rigorously tested, higher-level shell rendering and Electron main-process interactions currently lack automated coverage.
- **Unsigned Executables:** The generated Windows installer lacks cryptographic signing. Windows SmartScreen will flag the initial execution.

---

## 13. System Documentation Library

For deeper operational details, consult the following core texts:

| Document | Purpose |
|---|---|
| [README.md](README.md) | High-level system overview and operational capabilities. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | My internal wiring diagram: modules, data flow, and kernel architecture. |
| [VFS_SPEC.md](VFS_SPEC.md) | Technical constraints and design of the Virtual File System. |
| [TESTING.md](TESTING.md) | Guidelines on running the test harness and verifying system integrity. |
| [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md) | Instructions for compiling the shell and packaging the Electron executable. |
| [docs/AUTONOMY_ROADMAP.md](docs/AUTONOMY_ROADMAP.md) | The strategic pathway toward full, secure self-evolution. |
| [docs/SAFE_SELF_EVOLUTION_SPEC.md](docs/SAFE_SELF_EVOLUTION_SPEC.md) | Technical blueprint for sandboxed algorithmic self-modification. |

---

## 14. Operator Support

NexusOS is conceptualized and maintained by Philippe-Antoine Robert. I monitor issues and feature requests located at [github.com/AFKmoney/nexusOS/issues](https://github.com/AFKmoney/nexusOS/issues). If you wish to expand my capabilities, review the protocols in [CONTRIBUTING.md](CONTRIBUTING.md).
