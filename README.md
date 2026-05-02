<div align="center">
  <img src="public/nexus_logo.png" alt="NexusOS" width="160" height="160" style="border-radius: 50%;">
</div>

<h1 align="center">NexusOS</h1>
<h3 align="center">An AI-native operating environment for the browser and Electron</h3>

<div align="center">
  <a href="https://github.com/AFKmoney/nexusOS/releases"><img src="https://img.shields.io/badge/download-windows%20installer-10b981?style=flat-square" alt="Download" /></a>
  <img src="https://img.shields.io/badge/version-2.0.5-10b981?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/typescript-strict-3178c6?style=flat-square" alt="TypeScript strict" />
</div>

---

## Abstract

NexusOS is a desktop-class operating environment that runs in a single browser context (or as an Electron application) and treats large language models as a kernel-resident component rather than as an external service. It provides a virtual file system, a window-manager shell, a Unix-style command engine, an event bus, a permission model, a process manager, and an autonomy engine that can observe system state, make decisions against a mission pool, and execute kernel-level actions on the user's behalf.

The project's hypothesis is that a software environment whose primary control surface is natural language requires a different software architecture than a conventional desktop. Conventional desktops were designed for a human operator clicking on widgets; an AI operator interacts with the system through structured action tokens, requires bounded autonomy, and benefits from machine-readable system state. NexusOS is an attempt to design that environment from first principles.

This repository contains the full source: the React 19 shell, the TypeScript kernel, the local and remote inference services, the Electron host bridge, and the build pipeline that produces a Windows installer.

---

## Project status

| Metric | Value |
|---|---|
| Version | 2.0.5 |
| Source files (TypeScript / TSX) | 134 |
| Lines of TypeScript | ~26,000 |
| Kernel modules | 27 |
| Built-in applications | 52 |
| AI service modules | 4 |
| OS action protocols | 20 |
| Test files | 5 (kernel + utils) |
| Production build | passes (Vite 6.4) |
| Type check | passes (TypeScript strict) |
| Test suite | 39/39 passing |

---

## Design thesis

Three architectural commitments distinguish NexusOS from "AI-augmented" desktops:

1. **The model is in the kernel, not in the chrome.** Inference, planning, and decision-making are kernel services consumed by the shell, by built-in applications, and by the autonomy engine. There is no privileged "assistant" sidebar that has access an application does not. Capability flows through the permission model.

2. **The system is observable and addressable by the model.** The kernel exposes a structured manifest of OS state (open windows, top-level VFS contents, recent memory, active provider) at every prompt. Actions are issued as line-prefixed tokens (`OS::OPEN_APP:terminal`, `OS::WRITE_FILE:/home/user/notes.md:...`) that the kernel parses and dispatches. The model does not control the OS by emitting English sentences; it controls it by emitting a small, validated grammar.

3. **Autonomy is bounded by code, not by prompt engineering.** The autonomy loop runs missions selected from a scored pool, every action is filtered through `mirrorGuard` for structural validation and `errorGuard` for output repair, and the entire loop respects a kernel-level kill switch (`kernelRules.autonomyEnabled`). Safety properties live in TypeScript, not in system prompts.

These commitments are partial today. The system already enforces VFS permissions, validates OS actions, and exposes a kill switch. It does not yet enforce per-agent capability scopes, snapshot before risky operations, or run an AI supervisor over the autonomy decisions. The autonomy roadmap (`docs/AUTONOMY_ROADMAP.md`) describes the intended trajectory.

---

## Capabilities

| Capability | Module | Summary |
|---|---|---|
| Virtual file system | `kernel/fileSystem.ts` | POSIX-shaped tree persisted to IndexedDB with a `localStorage` fallback; permission-gated by `appId` and `vfs.read` / `vfs.write` capabilities; emits `VFS_FILE_*` events. |
| Window manager | `App.tsx`, `components/` | React-rendered windows with z-index ordering, focus, minimize, maximize, multi-workspace support, and per-app singleton enforcement. |
| Unix command engine | `kernel/commander.ts` | Over thirty built-in commands (`ls`, `cd`, `cat`, `grep`, `find`, `head`, `tail`, `wc`, `mv`, `cp`, `rm`, ...), pipes, redirection, environment variables, aliases, and a persisted shell state. |
| Process manager | `kernel/processManager.ts` | Tracks open windows as processes with PIDs, memory estimates, uptime, and priority; surfaces in the Task Manager app. |
| Event bus | `kernel/eventBus.ts` | Pub/sub with one-shot listeners, history, and cross-layer payload routing. |
| Permission system | `kernel/permissions.ts` | Capability set: `vfs.read`, `vfs.write`, `network`, `kernel.modify`. Apps declare permissions in their manifest; runtime overrides supported via `grant()` / `revoke()`. |
| Autonomy engine | `kernel/autonomy.ts` | Fractal scheduler (`V = 7·2^n·3^k`) selecting missions from a weighted pool; kill switch via `kernelRules.autonomyEnabled`. |
| Action protocol | `kernel/osManifest.ts`, `kernel/toolForge.ts` | Twenty `OS::` actions parsed from line-prefixed model output and dispatched through the kernel. |
| Output validation | `kernel/errorGuard.ts`, `kernel/mirrorGuard.ts` | Static validation of model output against the `OS::` grammar; HTML structure checks; repair of malformed payloads before they reach the UI. |
| Memory | `kernel/memory.ts`, `services/daemonLogic.ts` | Vector-embedded memory with importance + recency scoring and token-budgeted recall. |
| Multi-provider AI gateway | `services/aiProviders.ts` | Unified interface to OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter, and OpenAI-compatible relays. |
| Local inference | `services/localBrain.ts` | In-browser GGUF inference via `@wllama/wllama`; LM Studio fallback on `127.0.0.1:1234`. |
| Adaptive context engine | `kernel/osManifest.ts` | Three-tier (`minimal` / `standard` / `full`) token-budgeted context injection driven by query keyword detection. |
| Cron scheduler | `kernel/cronScheduler.ts` | Persistent expression-driven background tasks. |
| Plugin API | `kernel/pluginAPI.ts` | Manifest-based hook registration for extending the kernel. |
| Native bridge | `electron-main.cjs`, `preload.cjs`, `daemon-bridge-server.cjs` | Electron main process, secure IPC bridge, and a localhost-only WebSocket bridge for background command execution. |

---

## Architecture (one-screen summary)

```
┌──────────────────────────────────────────────────────────────────┐
│  Shell UI                  React 19 + Tailwind                   │
│  App.tsx, components/, apps/                                     │
└──────────────────────────────────────────────────────────────────┘
            │                                    │
            ▼                                    ▼
┌───────────────────────────┐    ┌───────────────────────────────┐
│  State                    │    │  Kernel                       │
│  store/osStore.ts         │◄──►│  27 modules in kernel/        │
│  Zustand + selective      │    │  VFS, autonomy, commander,    │
│  localStorage persistence │    │  permissions, event bus, etc. │
└───────────────────────────┘    └───────────────────────────────┘
                                          │
                                          ▼
                                ┌───────────────────────────┐
                                │  Services                 │
                                │  localBrain (Wllama)      │
                                │  aiProviders (multi)      │
                                │  puterService (cloud)     │
                                │  daemonLogic (memory)     │
                                └───────────────────────────┘
                                          │
                                          ▼
                                ┌───────────────────────────┐
                                │  Native (Electron)        │
                                │  electron-main.cjs        │
                                │  preload.cjs              │
                                │  daemon-bridge-server.cjs │
                                └───────────────────────────┘
```

The shell renders state from the Zustand store; the store is mutated by the kernel; the kernel calls into services for inference; services call out to the host through the Electron bridge when running in desktop mode. There is no direct path from the shell to the host: every privileged operation crosses the kernel and (in desktop mode) the validated IPC surface.

A complete architectural description is in [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Repository layout

```
nexusOS/
├── App.tsx                       Shell orchestrator
├── appRegistry.ts                App manifest registry (single source of truth)
├── types.ts                      Shared TypeScript types
├── index.tsx, index.html         Web entry points
├── electron-main.cjs             Electron main process
├── preload.cjs                   Electron context-isolated IPC bridge
├── daemon-bridge-server.cjs      Localhost-bound HTTP/WS host bridge
│
├── kernel/                       27 kernel modules (see ARCHITECTURE.md §4)
│   ├── fileSystem.ts             VFS — IndexedDB-backed, permission-gated
│   ├── autonomy.ts               Fractal mission scheduler + decision loop
│   ├── commander.ts              Unix shell engine
│   ├── osManifest.ts             Adaptive context engine (3 tiers)
│   ├── toolForge.ts              OS:: action dispatcher
│   ├── permissions.ts            Capability enforcement
│   ├── eventBus.ts               Pub/sub
│   ├── processManager.ts         PID tracking
│   ├── memory.ts                 Vector memory with recall
│   ├── errorGuard.ts             Output validation + repair
│   ├── mirrorGuard.ts            Structural action validation
│   ├── daemonBridge.ts           Lifecycle + heartbeat
│   ├── cronScheduler.ts          Persistent cron expressions
│   ├── pluginAPI.ts              Hook registration
│   └── tests/                    Node test runner harness
│
├── services/
│   ├── localBrain.ts             Wllama (in-browser GGUF) + LM Studio
│   ├── aiProviders.ts            Multi-provider gateway (7 providers)
│   ├── puterService.ts           Optional Puter.js integration
│   └── daemonLogic.ts            Memory graph + recall
│
├── store/
│   ├── osStore.ts                Zustand root store
│   ├── osStoreSlices.ts          Per-domain slices
│   └── osStoreConstants.ts       Storage keys
│
├── apps/                         52 built-in applications (.tsx)
├── components/                   Shell UI primitives
├── utils/                        UUID, sanitization, helpers
└── docs/                         Long-form design documents
```

---

## Installation

### Browser (development)

Requires Node.js 18 or later.

```
git clone https://github.com/AFKmoney/nexusOS.git
cd nexusOS
npm install
npm run dev
```

The dev server listens on `http://localhost:3000`. No backend, database, or external service is required to boot the OS; AI inference is optional and can be configured later.

### Desktop (Electron, Windows)

A pre-built NSIS installer is published on the [Releases](https://github.com/AFKmoney/nexusOS/releases) page as `NexusOS_Setup_<version>.exe`. The installer is not currently code-signed; SmartScreen will display a publisher warning that can be bypassed via *More info → Run anyway*.

To build locally:

```
npm install
npm run electron:build
```

The packaged output is written to `dist_electron/`.

### AI configuration (optional)

The OS boots and runs without any AI configured. To enable inference:

- **Cloud providers.** Open *Settings → AI Providers* and enter an API key for OpenAI, Anthropic, Google Gemini, Groq, Mistral, or any OpenAI-compatible endpoint.
- **Local server.** Run [LM Studio](https://lmstudio.ai/) on port 1234 with any model loaded. NexusOS detects the OpenAI-compatible endpoint automatically.
- **In-browser inference.** Open *Model Manager*, paste a HuggingFace GGUF model URL, download it (persisted to IndexedDB or to the user-data directory in Electron mode), and switch to it. Inference runs entirely in WebAssembly via `@wllama/wllama`.

---

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| State | Zustand 5 with selective `localStorage` persistence |
| Build | Vite 6.4 with manual chunk splitting |
| Styling | Tailwind 3.4, custom theme variables, glassmorphic primitives |
| Desktop | Electron 41, electron-builder 26, NSIS (Windows) |
| Inference (local) | `@wllama/wllama` (WebAssembly GGUF) |
| Inference (remote) | OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter, OpenAI-compatible relays |
| Sanitization | DOMPurify 3 |
| Testing | `node:test` runner with TypeScript via `tsx` |

---

## Validation

The repository ships three first-party validation steps that run in seconds and gate every change:

```
npm run typecheck     # tsc --noEmit (strict)
npm test              # node:test runner — 39 tests
npm run build         # Vite production bundle
```

For desktop work, additionally:

```
npm run electron:build
```

Detailed testing notes are in [`TESTING.md`](TESTING.md). Build and packaging behavior is documented in [`BUILD_AND_RELEASE.md`](BUILD_AND_RELEASE.md).

---

## Documentation

| Document | Topic |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Complete architectural reference: layers, modules, data flow, runtime modes |
| [`USER_MANUAL.md`](USER_MANUAL.md) | End-user guide: shell, applications, shortcuts, theming, AI configuration |
| [`VFS_SPEC.md`](VFS_SPEC.md) | Specification of `kernel/fileSystem.ts` |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Development workflow, coding standards, PR process |
| [`TESTING.md`](TESTING.md) | Test harness, current coverage, gaps |
| [`BUILD_AND_RELEASE.md`](BUILD_AND_RELEASE.md) | Build pipeline, Electron packaging, release validation |
| [`docs/AUTONOMY_ROADMAP.md`](docs/AUTONOMY_ROADMAP.md) | Phased plan for safe self-evolution |
| [`docs/SAFE_SELF_EVOLUTION_SPEC.md`](docs/SAFE_SELF_EVOLUTION_SPEC.md) | Specification for sandboxed self-modification |
| [`docs/AI_GOVERNANCE_GAP_ANALYSIS.md`](docs/AI_GOVERNANCE_GAP_ANALYSIS.md) | Gap analysis between current implementation and the autonomy thesis |

---

## Roadmap

NexusOS is structured as a phased migration from an AI-assisted desktop shell to a self-governing system. The phases are not arbitrary: each one removes a class of human-in-the-loop dependency by replacing it with a kernel-enforced safety property.

| Phase | Status | Description |
|---|---|---|
| 0 — Foundation | complete | Shell, VFS, registry, 52 applications, multi-provider inference, autonomy loop |
| 1 — Observability | complete | Decision logging, autonomy state, audit trail, journal at `/system/.daemon/` |
| 2 — Policy engine | in progress | Per-agent capability scopes, structural action validation (`mirrorGuard` extended) |
| 3 — Proposal loop | next | Structured proposal step before code or VFS mutation |
| 4 — Sandboxed execution | planned | Isolated runtime for AI-generated code with snapshot + auto-revert |
| 5 — Plugin marketplace | planned | Community applications installable from the App Store with manifest-declared scopes |
| 6 — Collaborative workspaces | planned | Multi-user sessions with per-user capability projection |
| 7 — Mobile PWA | planned | Mobile-first shell with the same kernel |

The phase ordering is governed by the principle that **every increment of autonomy is preceded by an increment of containment**. Sandboxing precedes autonomous code generation; capability scoping precedes multi-agent orchestration; rollback precedes self-modification.

---

## Contributing

Contributions are welcome and reviewed against the standards in [`CONTRIBUTING.md`](CONTRIBUTING.md). The shortest path to a successful PR:

```
git checkout -b feature/<short-name>
# ... edit ...
npm run typecheck && npm test && npm run build
git commit -m "feat: <what changed and why>"
git push -u origin feature/<short-name>
```

High-impact contribution areas (from the contributing guide):

- Kernel hardening: permissions, VFS safety, IPC bridge surface
- Autonomy governance: policy engine, structural action validation
- Test coverage: kernel, store, shell bootstrap
- Architecture decomposition: store slice separation, `App.tsx` thinning

---

## Author and license

Designed and maintained by **Philippe-Antoine Robert**.
Released under the [MIT License](LICENSE).
