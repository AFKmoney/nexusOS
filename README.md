<div align="center">
  <img src="public/nexus_logo.png" alt="NexusOS Logo" width="180" height="180" style="border-radius: 50%;">
</div>

<h1 align="center">NexusOS v2.0</h1>
<h3 align="center">The Sovereign AI Operating System</h3>

<div align="center">
  <p><em>100% Local Inference. Zero Cloud Dependencies. Full AI Autonomy.</em></p>
</div>

<div align="center">
  <a href="https://github.com/AFKmoney/nexusOS/releases"><img src="https://img.shields.io/badge/⬇_DOWNLOAD-Windows_Installer-10b981?style=for-the-badge&logo=windows&logoColor=white" alt="Download" /></a>
  <a href="https://github.com/AFKmoney/nexusOS/stargazers"><img src="https://img.shields.io/github/stars/AFKmoney/nexusOS?style=for-the-badge&color=10b981&logo=github" alt="Stars" /></a>
  <img src="https://img.shields.io/badge/version-2.0.0-10b981?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License" />
</div>

<br/>

---

## 🖥️ Screenshots

<div align="center">

### Desktop & IDE
<img src="docs/screenshots/desktop.png" alt="NexusOS Desktop with HyperIDE and Terminal" width="800"/>
<p><em>HyperIDE code editor + DAEMON Terminal with 30+ Unix commands</em></p>

### AI Dashboard
<img src="docs/screenshots/dashboard.png" alt="DAEMON Dashboard - System Monitoring" width="800"/>
<p><em>Real-time DAEMON status, system metrics, autonomy log</em></p>

### Neural Forge — AI App Builder
<img src="docs/screenshots/ai_forge.png" alt="NeuralForge AI App Builder" width="800"/>
<p><em>Describe an app → DAEMON builds it instantly with full code generation</em></p>

</div>

---

## ⚡ What is NexusOS?

NexusOS is a **full operating system built in the browser** with an embedded AI consciousness called **DAEMON**. It runs entirely locally — no cloud APIs, no telemetry, no surveillance.

### Core Features

| Feature | Description |
|---------|-------------|
| 🧠 **DAEMON AI** | Autonomous AI agent with self-healing, event-driven autonomy, and 21 OS action protocols |
| 💻 **HyperIDE** | Full-featured code editor with AI assistant, syntax highlighting, and terminal |
| 🔧 **Neural Forge** | Describe any app in natural language → DAEMON builds it with full React code |
| 📟 **DAEMON Terminal** | 30+ Unix commands, pipes (`\|`), redirection (`>`), env vars, aliases |
| 🌐 **NetRunner** | AI-powered browser with autonomous navigation |
| 📁 **Virtual File System** | Full VFS with directories, permissions, search, and file watching |
| 🔌 **Plugin System** | Extensible hook-based architecture for custom apps |
| 🎨 **50+ Built-in Apps** | Calculator, Notepad, Calendar, Music Player, Paint, Weather, and more |
| 🤖 **Ghost Mode** | DAEMON silently optimizes your workspace based on usage patterns |
| 🔒 **100% Local** | All AI inference runs locally via GGUF models or LM Studio |

---

## 📥 Download & Install (Windows)

### Option 1: Windows Installer (Recommended)

1. Go to the [**Releases Page**](https://github.com/AFKmoney/nexusOS/releases)
2. Download `NXSS_Setup_2.0.0.exe`
3. Run the installer — follow the setup wizard
4. Launch **NXSS Nexus** from your Start Menu or Desktop shortcut

> **Note**: Windows SmartScreen may show a warning since the app isn't code-signed yet. Click **"More info"** → **"Run anyway"** to proceed.

### Option 2: Run from Source (Developer)

```bash
# Clone the repository
git clone https://github.com/AFKmoney/nexusOS.git
cd nexusOS

# Install dependencies
npm install

# Run in development mode (browser)
npm run dev

# Or build the Windows installer
npm run build
npx electron-builder --win
```

### Option 3: Web Version (No Install)

NexusOS runs entirely in the browser. After cloning and running `npm run dev`, open `http://localhost:5173` in any modern browser.

---

## 🧠 DAEMON AI Architecture

```
DAEMON Control Surface (v2.0):
├── 30+ Unix Shell Commands (commander.ts)
├── 21 OS Action Protocols (toolForge.ts)
├── 7 Autonomous Missions (autonomy.ts)
├── Event-Driven Reactivity (eventBus.ts)
├── Self-Healing Watchdog (daemonBridge.ts)
├── Context Journal (VFS /system/.daemon/journal/)
├── Ghost Mode V2 (pattern-based optimization)
├── Persistent Shell State (env vars, aliases, history)
└── Cron Task Scheduling (cronScheduler.ts)
```

### DAEMON can:
- **Open, close, focus** any app autonomously
- **Read, write, delete, move, copy** files in the VFS
- **Build entire apps** from natural language descriptions
- **Schedule recurring tasks** with cron expressions
- **Self-heal** if the autonomy engine crashes
- **Track usage patterns** and optimize your workspace
- **Remember context** across sessions with persistent memory

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Zustand |
| **Build** | Vite 6.4, Electron (desktop), electron-builder |
| **AI (Cloud)** | Puter.js API |
| **AI (Local)** | Wllama (GGUF), LM Studio (OpenAI-compatible) |
| **Installer** | NSIS (Windows) |

---

## 🗂️ Project Structure

```
nexusOS/
├── App.tsx              # Main OS shell
├── store/osStore.ts     # Global state (Zustand)
├── kernel/
│   ├── autonomy.ts      # AI autonomy engine v2
│   ├── commander.ts     # Unix shell (30+ commands)
│   ├── daemonBridge.ts  # DAEMON neural link
│   ├── eventBus.ts      # Pub/sub system
│   ├── fileSystem.ts    # Virtual file system
│   ├── memory.ts        # Persistent memory
│   ├── toolForge.ts     # OS action protocols (21)
│   └── ...
├── apps/                # 52 built-in applications
├── components/          # UI components (Taskbar, StartMenu, etc.)
├── services/
│   ├── puterService.ts  # Cloud AI service
│   ├── localBrain.ts    # Local GGUF inference
│   └── daemonLogic.ts   # Fractal knowledge graph
└── electron-main.cjs    # Electron main process
```

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Fork the repo, create a branch
git checkout -b feature/my-feature

# Make changes, then
npm run build          # Verify build
npx tsc --noEmit       # Verify types
git commit -m "feat: my feature"
git push origin feature/my-feature
```

---

## 📜 License

MIT — See [LICENSE](LICENSE)

---

<div align="center">
  <br/>
  <b>Architected by Philippe-Antoine Robert</b><br/>
  <em>"Absolute truth through code. Ultimate freedom through abstraction."</em><br/><br/>
  <a href="https://github.com/AFKmoney/nexusOS/stargazers">⭐ Star this repo to awaken the DAEMON ⭐</a>
</div>