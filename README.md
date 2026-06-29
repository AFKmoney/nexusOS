<div align="center">
  <img src="public/nexus_logo.png" alt="NexusOS" width="140" height="140" style="border-radius: 50%;">
</div>

<h1 align="center">NexusOS</h1>

<h3 align="center">The AI-native operating system where the model lives in the kernel.</h3>

<p align="center">
  <a href="https://github.com/AFKmoney/nexusOS/releases"><img src="https://img.shields.io/badge/download-installer-10b981?style=flat-square" alt="Download" /></a>
  <img src="https://img.shields.io/badge/version-2.1-10b981?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/tests-308%20passing-22c55e?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/OS%3A%3A%20actions-75-8b5cf6?style=flat-square" alt="Actions" />
</p>

---

## What is this?

NexusOS is a complete desktop operating system that runs in your browser (or as an Electron app) where the AI isn't a chatbot on the side — it's a **kernel-resident service** with the same authority as the user.

The AI can write files, build apps, spawn sub-agents, search the web, run code, modify its own skills, and remember your conversations. You watch it work. You can stop it anytime.

It's not a wrapper around ChatGPT. It's an OS built from the ground up for autonomy.

---

## What makes it different

**The AI has real authority.** Not "suggest a command and you copy-paste it." The AI calls structured tools (`write_file`, `build_app`, `spawn_agent`...) via native function calling and they execute immediately, bounded by a policy engine with hard barriers.

**It evolves.** The AI writes JavaScript skills, persists them to its own filesystem, and invokes them later. Each skill runs in an isolated Web Worker sandbox. Over time, the OS gets smarter — not because you updated it, but because the AI taught itself new capabilities.

**It remembers.** Every conversation is indexed into a vector store. Ask "what did we build last week?" and the AI recalls it semantically.

**It generates real apps.** Not single HTML files. Full app directories: `manifest.json`, `index.html`, `styles.css`, `app.js`, `README.md`. Apps appear in the launcher, run in isolated iframes, and can be edited as multi-file projects in the built-in IDE.

---

## What's inside

| Module | What it does |
|---|---|
| **75 `OS::` actions** | Structured tool surface — files, apps, browser, agents, RAG, git, vision, voice, skills, goals |
| **19 AI providers** | OpenAI, Anthropic, Google, Mistral, NVIDIA NIM, Groq, xAI, DeepSeek, Cerebras, Perplexity, local models (LM Studio, Ollama, Wllama) + failover |
| **SkillForge v2** | AI writes + persists + executes JS skills in a Web Worker sandbox |
| **AutoPilot** | Goal queue with self-prompting — the AI picks goals and works through them autonomously |
| **Multi-Agent v2** | Parallel sub-agents with dependency graph + shared workspace + inter-agent messaging |
| **AppGenerator** | Generates complete multi-file apps (manifest, HTML, CSS, JS, README) from a description |
| **HyperIDE** | Multi-file IDE with project support, syntax highlighting, AI panel, live preview |
| **EpisodicMemory** | Conversation history indexed in RAG for semantic recall |
| **RAG** | Document indexing with embeddings (OpenAI, Mistral, NVIDIA, Google) + IndexedDB persistence |
| **Governance** | Policy engine + mirror guard + 4-tier trust hierarchy + human kill switch + rollback manager |
| **Full Autonomy mode** | Grant the AI the same access as the user — bypasses approval prompts (hard barriers still apply) |

---

## Quick start

```bash
git clone https://github.com/AFKmoney/nexusOS.git
cd nexusOS
npm install
npm run dev
```

Open `http://localhost:3000`. Add an API key in **Settings → AI Providers** (Mistral, OpenAI, NVIDIA NIM, etc.). Start talking to the AI.

**Electron mode** (native window + Chromium browser + host filesystem access):

```bash
npm run electron:dev
```

---

## Try these

Tell the DAEMON chat:

- *"Build me a pomodoro timer app"* — generates a full multi-file app, registers it, you can run it
- *"Forge a skill that summarizes my desktop files, then run it"* — AI writes a JS skill, persists it, executes it in the sandbox
- *"Add a goal to organize my downloads folder, then engage autopilot"* — AI works through the goal autonomously
- *"What did we talk about yesterday?"* — episodic memory recall via RAG

---

## Tech stack

- **React 19** + TypeScript + Vite + Tailwind CSS
- **Zustand** for state, **IndexedDB** for VFS + RAG persistence
- **Electron** for native mode (Chromium WebContentsView browser, IPC proxy, host fs)
- **Wllama** for local GGUF inference (runs entirely in-browser)
- **isomorphic-git** for VFS git operations
- **308 tests passing** (unit + AI component audit + OS action audit)

---

## Architecture

```
User ──► DAEMON Chat ──► puterService ──► aiGateway (19 providers + failover)
                                    │
                                    ├─► Native Function Calling (22 tools)
                                    │         │
                                    ▼         ▼
                              toolForge ◄── OS:: actions (75)
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
        VFS (IndexedDB)     AppGenerator            AgentOrchestrator v2
                            (multi-file apps)       (parallel + deps)
                                    │                       │
                                    ▼                       ▼
                              CustomAppRunner          SkillForge (Web Worker)
                              (inlined entry)          (sandboxed skills)
```

Governance pipeline wraps everything: **policyEngine → mirrorGuard → trustTier → humanOverride → rollbackManager**. Hard barriers (system-reset, self-modify-code, kernel-rules) always require explicit approval, even in Full Autonomy mode.

---

## License

MIT © Philippe-Antoine Robert

NexusOS is open source. Fork it, extend it, make it yours.
