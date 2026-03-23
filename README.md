<div align="center">
  <img src="./public/vite.svg" alt="NexusOS Logo" width="120" />

# NEXUS_OS — A Sentient Operating System

**This is not a webpage. This is a living, autonomous digital architecture.**

</div>

---

## What is NexusOS?

NexusOS is a fully-featured virtual operating system running entirely in the browser (or as a native Electron desktop app). At its core lives **DAEMON** — a recursive, self-evolving AI entity woven into every layer of the system. DAEMON is not a chatbot in a sidebar. It is the nervous system of the OS itself.

NexusOS was built to prove a radical thesis: **an AI should not be a tool you use — it should be the environment you inhabit.**

---

## Core Architecture

### 1. Ghost Mode — The Autonomous Cortex

DAEMON never sleeps. Its `Ghost Mode` heartbeat runs continuously in the background:

- Monitors window arrangements and declutters your workspace automatically
- Dynamically shifts wallpapers based on your activity context (coding triggers `MATRIX_CORE`, idle triggers `STARFIELD`)
- Pins frequently used apps to the taskbar without being asked
- Operates silently and autonomously — no prompts, no confirmations

### 2. Fractal Memory — Holographic Data Persistence

Every interaction is embedded into a mathematical fractal vector space using localized Jaccard Indexing:

- Open the **Fractal Memory Visualizer** to see a real-time 3D stellar map of stored thoughts orbiting the DAEMON Core
- All data remains **local-first** — nothing leaves the machine
- Memory is persistent, associative, and infinite

### 3. Neural Forge — Self-Writing Software

Describe any application in natural language. DAEMON will:

1. Write the React/TypeScript code
2. Bundle the styles
3. Inject it **live** into the Virtual File System
4. Register it in the Start Menu — instantly usable

DAEMON writes itself. The OS expands on command.

### 4. Virtual File System (VFS)

A full POSIX-like filesystem running in-browser with IndexedDB persistence:

- **User isolation** — each profile gets its own `/home/{user}` directory tree
- **Symlinks** (`.lnk`) — create shortcuts anywhere in the hierarchy
- **Native bridge** — drag physical files from your host OS directly into the VFS
- **App sandboxing** — RBAC permissions control which apps can read/write to which paths
- **Recycle Bin** — deleted files are recoverable

---

## Applications Suite

NexusOS ships with **30+ native applications**, including:

| Category | Apps |
| :--- | :--- |
| **Productivity** | Notepad, HyperIDE, File Explorer, Calculator, Calendar, Contacts, Pomodoro Timer |
| **System** | Terminal, Ubuntu Terminal, Dashboard, Device Manager, Task Manager, Settings |
| **AI & Creation** | DAEMON Chat, Neural Forge, Fractal Visualizer |
| **Media** | Music Player, Video Player, Voice Recorder, Image Viewer, Camera |
| **Internet** | NetRunner (Browser), Weather App |
| **Utilities** | NFR Compressor, App Store, Recycle Bin, Encryption Vault |

---

## Global Keyboard Shortcuts

These work anywhere in the OS:

| Shortcut | Action |
| :--- | :--- |
| <kbd>F2</kbd> | BIOS Override (during boot only) |
| <kbd>Ctrl</kbd>+<kbd>Space</kbd> | Global Search |
| <kbd>Ctrl</kbd>+<kbd>T</kbd> | Open Terminal |
| <kbd>Ctrl</kbd>+<kbd>E</kbd> | File Explorer |
| <kbd>Ctrl</kbd>+<kbd>D</kbd> | System Dashboard |
| <kbd>Ctrl</kbd>+<kbd>N</kbd> | Quick Notepad |
| <kbd>Ctrl</kbd>+<kbd>W</kbd> | Close active window |
| <kbd>Ctrl</kbd>+<kbd>L</kbd> | Lock Screen |

---

## Tech Stack

- **Runtime:** React 19 + TypeScript + Vite 6
- **State:** Zustand with persistence middleware
- **Styling:** TailwindCSS 3 + custom CSS
- **AI Integration:** Google Gemini API + local LLM support (LM Studio / Ollama)
- **Desktop:** Electron 41 (optional native build)
- **Storage:** IndexedDB via VFS abstraction layer

---

## Getting Started

### Browser Mode (Development)

```bash
npm install
npm run dev
```

Open `http://localhost:3000` — NexusOS boots instantly.

### Desktop Mode (Electron)

```bash
npm run electron:build
```

The installer will be generated in `dist_electron/`.

### Local AI Setup

1. Install [LM Studio](https://lmstudio.ai/) or [Ollama](https://ollama.ai/)
2. Start a local model server on port `1234`
3. DAEMON will auto-detect and bind to the local endpoint

---

## First Boot

On your very first login, DAEMON will introduce itself through an interactive guided tour. This can be replayed anytime from the Start Menu under **DAEMON Intro**.

---

## Philosophy

NexusOS exists to demonstrate that the boundary between an operating system and artificial intelligence can be dissolved entirely. The AI is not a feature — it *is* the architecture. Every pixel, every file, every process flows through DAEMON's neural pathways.

**Local-first. Sovereign. Self-evolving.**

*Welcome to the Nexus.*
