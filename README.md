<div align="center">
  <img src="public/nexus_logo.png" alt="NexusOS" width="160" height="160" style="border-radius: 50%;">
</div>

<h1 align="center">NexusOS</h1>

<h3 align="center">A sovereign, AI-native operating environment that runs in your browser.</h3>

<p align="center">
  NexusOS treats large language models as a <strong>kernel-resident component</strong> — not as an external chatbot — and gives them a small, validated grammar for controlling the system. Every privileged action the model takes flows through a deny-by-default policy engine, a four-tier trust hierarchy, an isolated staging layer, and a human kill switch that survives reloads.
</p>

<div align="center">
  <a href="https://github.com/AFKmoney/nexusOS/releases"><img src="https://img.shields.io/badge/download-windows%20installer-10b981?style=flat-square" alt="Download Windows" /></a>
  <img src="https://img.shields.io/badge/version-2.0.6-10b981?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/typescript-strict-3178c6?style=flat-square" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/tests-144%20passing-22c55e?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/PWA-ready-f59e0b?style=flat-square" alt="PWA Ready" />
</div>

---

## What is NexusOS?

NexusOS is a desktop-class operating environment that boots in a single browser tab and runs as a native desktop app via Electron. It is **not** a chat interface bolted onto a window manager — it is a real operating-system substrate (virtual file system, process manager, Unix command engine, event bus, permission model, plugin API) with **inference as a kernel service** that any application or the autonomy engine can consume on equal footing.

Three things make NexusOS different from "AI-augmented" desktops:

### 1. The model lives inside the kernel

Inference, planning, and decision-making are kernel services consumed by the shell, by built-in applications, and by the autonomy engine. There is no privileged "assistant" sidebar with access an application does not have. Capability flows through the same permission model that gates every other app.

### 2. The system is observable and addressable by the model

At every prompt, the kernel exposes a structured manifest of OS state — open windows, top-level VFS contents, recent memory, active provider — and the model issues actions through a small validated grammar of line-prefixed tokens:

```
OS::OPEN_APP:terminal
OS::WRITE_FILE:/home/user/notes.md:...
OS::NOTIFY:Reminder:Daily standup in 5 minutes
OS::BUILD_APP:A markdown viewer with syntax highlighting
```

The kernel parses these tokens, validates them against the registered action set, and dispatches them through the normal permission path. The model does not control the OS by emitting English sentences — it controls it by emitting a grammar the kernel enforces.

### 3. Autonomy is bounded by code, not by prompt engineering

The autonomy loop runs missions selected from a weighted, context-aware pool. Every action passes through:

- **`mirrorGuard`** — structural validation of model output against the `OS::` grammar
- **`errorGuard`** — detection and repair of malformed payloads before they reach the UI
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
| Source files (TypeScript / TSX) | 161 |
| Lines of TypeScript | ~31,000 |
| Kernel modules | 41 |
| Built-in applications | 54 |
| Test files | 22 (kernel + utils + e2e) |
| Test suite | **144 / 144 passing** |
| Production build | passes (Vite 8, ~1.5s) |
| Type check | passes (TypeScript strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |

---

## Capabilities

### Core operating substrate

| Capability | Module | Summary |
|---|---|---|
| Virtual file system | `kernel/fileSystem.ts` | POSIX-shaped tree persisted to IndexedDB with a `localStorage` fallback; permission-gated by `appId` and `vfs.read` / `vfs.write` capabilities; emits `VFS_FILE_*` events. |
| Window manager | `App.tsx`, `components/` | React-rendered windows with z-index ordering, focus, minimize, maximize, multi-workspace support, and per-app singleton enforcement. |
| Unix command engine | `kernel/commander.ts` | Over thirty built-in commands (`ls`, `cd`, `cat`, `grep`, `find`, `head`, `tail`, `wc`, `mv`, `cp`, `rm`, …), pipes, redirection, environment variables, aliases, and a persisted shell state. |
| Process manager | `kernel/processManager.ts` | Tracks open windows as processes with PIDs, memory estimates, uptime, and priority; surfaces in the Task Manager app. |
| Event bus | `kernel/eventBus.ts` | Pub/sub with one-shot listeners, history, and cross-layer payload routing. |
| Permission system | `kernel/permissions.ts` | Capability set: `vfs.read`, `vfs.write`, `network`, `kernel.modify`. Apps declare permissions in their manifest; runtime overrides via `grant()` / `revoke()`. |
| Memory | `kernel/memory.ts`, `services/daemonLogic.ts` | Vector-embedded memory with importance + recency scoring and token-budgeted recall. |
| Cron scheduler | `kernel/cronScheduler.ts` | Persistent expression-driven background tasks. |
| Plugin API | `kernel/pluginAPI.ts` | Manifest-based hook registration for extending the kernel. |

### AI and inference

| Capability | Module | Summary |
|---|---|---|
| Multi-provider AI gateway | `services/aiProviders.ts` | Unified interface to OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter, and OpenAI-compatible relays. |
| Local inference | `services/localBrain.ts` | In-browser GGUF inference via `@wllama/wllama`; LM Studio fallback on `127.0.0.1:1234`. |
| Adaptive context engine | `kernel/osManifest.ts` | Three-tier (`minimal` / `standard` / `full`) token-budgeted context injection driven by query keyword detection. |
| Action protocol | `kernel/osManifest.ts`, `kernel/toolForge.ts` | Twenty `OS::` actions parsed from line-prefixed model output and dispatched through the kernel. |
| Output validation | `kernel/errorGuard.ts`, `kernel/mirrorGuard.ts` | Static validation of model output against the `OS::` grammar; HTML structure checks; repair of malformed payloads before they reach the UI. |
| Autonomy engine | `kernel/autonomy.ts` | Fractal scheduler (`V = 7·2ⁿ·3ᵏ`) selecting missions from a weighted pool; kill switch via `kernelRules.autonomyEnabled`. |

### Autonomy governance pipeline

| Capability | Module | Summary |
|---|---|---|
| Policy engine | `kernel/policyEngine.ts` | Deny-by-default permission gateway. Evaluates every AI action against 15 priority-ordered rules before dispatch. |
| Autonomy event log | `kernel/autonomyEventLog.ts` | Append-only structured audit trail with 27 event kinds, run correlation IDs, and subscriber notifications. |
| Proposal engine | `kernel/proposalEngine.ts` | AI must create a Proposal before any state mutation. Full state machine: draft → validating → pending-approval → approved → executing → succeeded/failed/rolled-back. |
| Validation pipeline | `kernel/validationPipeline.ts` | Pre-execution gate running completeness, rollback-adequacy, and risk-approval consistency validators. |
| Staging manager | `kernel/stagingManager.ts` | Isolated staging layer. Artifacts must be staged, sealed, then promoted before any live mutation. |
| Trust tier engine | `kernel/trustTierEngine.ts` | Four-tier hierarchy (doc < ui < app-logic < kernel) with per-tier approval gates (auto / validate-only / user-approval / admin-approval). |
| Rollback manager | `kernel/rollbackManager.ts` | Deep-clone snapshots for store-state, vfs-file, app-registry, kernel-rule, and autonomy-policy. Async rollback with audit log records. |
| Human override | `kernel/humanOverride.ts` | Persistent kill switch with four modes (active / paused / safe-mode / disabled). Survives reload. Human override is final. |
| Autonomy health monitor | `kernel/autonomyHealthMonitor.ts` | Rolling 60-second metrics window. Tracks success rate, rollback rate, validation failure rate, and confidence score. Auto-enters safe mode on critical confidence. |
| Governance Dashboard | `apps/GovernanceDashboard.tsx` | Shell-visible 6-tab app: Proposals (approve/deny), Audit Log, Health Metrics, Staging, Trust Tiers, Neural Field. Kill switch and pause/resume in status strip. |

### Native bridge

| Capability | Module | Summary |
|---|---|---|
| Electron host | `electron-main.cjs`, `preload.cjs`, `daemon-bridge-server.cjs` | Electron main process, context-isolated IPC bridge, and a localhost-only WebSocket bridge for background command execution. The `native-exec` channel requires explicit user confirmation via a modal dialog before any host command is executed. |

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
│  State                    │    │  Kernel                       │
│  store/osStore.ts         │◄──►│  41 modules in kernel/        │
│  Zustand + selective      │    │  VFS, autonomy, commander,    │
│  localStorage persistence │    │  governance pipeline, etc.    │
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

The shell renders state from the Zustand store; the store is mutated by the kernel; the kernel calls into services for inference; services call out to the host through the Electron bridge when running in desktop mode. **There is no direct path from the shell to the host** — every privileged operation crosses the kernel and (in desktop mode) the validated IPC surface.

A complete architectural reference is in [`ARCHITECTURE.md`](ARCHITECTURE.md).

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
├── kernel/                       41 kernel modules
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
│   ├── policyEngine.ts           Deny-by-default AI action policy
│   ├── autonomyEventLog.ts       Append-only structured audit trail
│   ├── proposalEngine.ts         AI proposal state machine
│   ├── validationPipeline.ts     Pre-execution validation gate
│   ├── stagingManager.ts         Artifact staging and deploy lifecycle
│   ├── trustTierEngine.ts        4-tier trust hierarchy (doc→kernel)
│   ├── rollbackManager.ts        Snapshot + async restore primitives
│   ├── humanOverride.ts          Persistent kill switch (4 modes)
│   ├── autonomyHealthMonitor.ts  Rolling metrics + auto safe-mode
│   ├── governanceBridge.ts       Reactive sync to OS store
│   ├── log.ts                    Centralized kernel logger
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
├── apps/                         54 built-in applications
│   ├── hyperide/                 Decomposed HyperIDE sub-components
│   ├── governance/               GovernanceDashboard sub-components
│   ├── modelmanager/             ModelManager sub-components
│   └── *.tsx                     App entry points
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

The dev server listens on `http://localhost:3000`. No backend, database, or external service is required to boot the OS; AI inference is optional and can be configured later.

### Desktop (Electron, Windows)

A pre-built NSIS installer is published on the [Releases](https://github.com/AFKmoney/nexusOS/releases) page as `NexusOS_Setup_<version>.exe`. The installer is not currently code-signed; SmartScreen will display a publisher warning that can be bypassed via *More info → Run anyway*.

To build locally:

```bash
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
| Build | Vite 8 with manual chunk splitting |
| Styling | Tailwind 3.4, custom theme variables, glassmorphic primitives |
| Desktop | Electron 41, electron-builder 26, NSIS (Windows) |
| Inference (local) | `@wllama/wllama` (WebAssembly GGUF) |
| Inference (remote) | OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter, OpenAI-compatible relays |
| Sanitization | DOMPurify 3 |
| Testing | `node:test` runner with TypeScript via `tsx`; Puppeteer E2E harness |

---

## Validation

The repository ships three first-party validation steps that run in seconds and gate every change:

```bash
npm run typecheck     # tsc --noEmit (strict)
npm test              # node:test runner — 144 tests
npm run build         # Vite production bundle
```

For desktop work, additionally:

```bash
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
| [`SECURITY.md`](SECURITY.md) | Security policy and incident history |
| [`docs/AUTONOMY_ROADMAP.md`](docs/AUTONOMY_ROADMAP.md) | Phased plan for safe self-evolution — all phases complete |
| [`docs/SAFE_SELF_EVOLUTION_SPEC.md`](docs/SAFE_SELF_EVOLUTION_SPEC.md) | Specification for sandboxed self-modification |
| [`docs/AI_GOVERNANCE_GAP_ANALYSIS.md`](docs/AI_GOVERNANCE_GAP_ANALYSIS.md) | Original gap analysis — all gaps resolved |
| [`docs/AUDIT_AND_TODO.md`](docs/AUDIT_AND_TODO.md) | Current audit status and outstanding work |

---

## Roadmap

NexusOS is structured as a phased migration from an AI-assisted desktop shell to a self-governing system. The phases are not arbitrary: each one removes a class of human-in-the-loop dependency by replacing it with a kernel-enforced safety property.

| Phase | Status | Description |
|---|---|---|
| 0 — Foundation | ✅ complete | Shell, VFS, registry, 54 applications, multi-provider inference, autonomy loop |
| 1 — Audit log | ✅ complete | `autonomyEventLog`: 27 event kinds, run correlation IDs, subscriber pattern |
| 2 — Policy engine | ✅ complete | `policyEngine`: deny-by-default, 15 rules, per-action-class decisions |
| 3 — Proposal loop | ✅ complete | `proposalEngine`: full proposal state machine, AI must propose before mutating |
| 4 — Validation pipeline | ✅ complete | `validationPipeline`: completeness, rollback-adequacy, risk-approval validators |
| 5 — Staging | ✅ complete | `stagingManager`: isolated staging layer, seal/promote/revert lifecycle |
| 6 — Rollback | ✅ complete | `rollbackManager`: deep-clone snapshots, async restore, 5 artifact kinds |
| 7 — Health monitoring | ✅ complete | `autonomyHealthMonitor`: rolling metrics, confidence score, auto safe-mode |
| 8 — Trust tiers | ✅ complete | `trustTierEngine`: doc < ui < app-logic < kernel, per-tier approval gates |
| 9 — Human override | ✅ complete | `humanOverride`: persistent kill switch, 4 modes, survives reload |
| — Governance Dashboard | ✅ complete | 6-tab shell app: Proposals, Audit Log, Metrics, Staging, Trust Tiers, Neural Field |
| — Pipeline integration | ✅ complete | `autonomy.ts` wired end-to-end: every command classified, tiered, and routed |

The phase ordering is governed by the principle that **every increment of autonomy is preceded by an increment of containment**. Sandboxing precedes autonomous code generation; capability scoping precedes multi-agent orchestration; rollback precedes self-modification.

### Future work

- **Code-signing** for the Windows NSIS installer (OV/EV certificate + `electron-builder.yml` configuration)
- **macOS and Linux installers** (`AppImage`, `.snap`, `.dmg`) — the `release.yml` workflow already targets Linux, but `electron-builder.yml` is Windows-only
- **Test coverage** for the remaining untested kernel modules (currently 22 of 41 modules have dedicated test files)
- **App decomposition** — continue the pattern established in `apps/hyperide/`, `apps/governance/`, and `apps/modelmanager/` for other large app components

---

## Contributing

Contributions are welcome and reviewed against the standards in [`CONTRIBUTING.md`](CONTRIBUTING.md). The shortest path to a successful PR:

```bash
git checkout -b feature/<short-name>
# ... edit ...
npm run typecheck && npm test && npm run build
git commit -m "feat: <what changed and why>"
git push -u origin feature/<short-name>
```

High-impact contribution areas:

- **Kernel hardening** — permissions, VFS safety, IPC bridge surface
- **Autonomy governance** — policy engine, structural action validation, new validators
- **Test coverage** — kernel modules, store, shell bootstrap, app-level E2E
- **Architecture decomposition** — continue splitting large components into focused sub-components

---

## Author and license

Designed and maintained by **Philippe-Antoine Robert**.
Released under the [MIT License](LICENSE).
