# Contributing to NexusOS

## The Vision

NexusOS is building the first operating system where AI is not a feature — it is the kernel. Every contribution moves us closer to a self-evolving, self-healing, sovereign computing environment.

We welcome contributions from developers, designers, researchers, and anyone who believes AI should serve users, not surveil them.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, constructive, and collaborative.

---

## How to Contribute

### 🐛 Reporting Bugs

- Use [GitHub Issues](https://github.com/AFKmoney/nexusOS/issues) with the `bug` label
- Include steps to reproduce, expected vs actual behavior
- Specify your OS, browser, and whether you're using Web or Electron mode
- Attach screenshots, console logs, or error messages

### 💡 Suggesting Features

- Open an issue with the `feature request` label
- Describe the problem you're solving
- Explain your proposed solution
- Consider how it fits with DAEMON's autonomy model

### 📝 Improving Documentation

- Fix typos, unclear explanations, or missing context
- Add examples, tutorials, or workflow guides
- Ensure technical docs match the current codebase
- All documentation should be written in English

### 🔧 Contributing Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes following existing patterns and style
4. Validate your changes (see below)
5. Submit a pull request with a clear description

---

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- (Optional) Electron for desktop builds

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/nexusOS.git
cd nexusOS
npm install
```

### Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Validation

Before submitting any PR, run all three validation steps:

```bash
# 1. Type safety
npm run typecheck

# 2. Kernel tests
npm test

# 3. Production build
npm run build
```

All three must pass. If you're modifying Electron behavior:

```bash
# 4. Electron packaging
npm run electron:build
```

---

## Architecture Awareness

Before writing code, understand the layer your change affects:

| Layer | Directory | Key Files |
|---|---|---|
| Shell UI | `components/`, `App.tsx` | Taskbar, StartMenu, WindowManager |
| State | `store/` | `osStore.ts` — all global state |
| Kernel | `kernel/` | VFS, permissions, autonomy, commands, events |
| Services | `services/` | AI inference, DAEMON logic, cloud fallback |
| Apps | `apps/` | 52 built-in applications |
| Native | Root | `electron-main.cjs`, `preload.cjs` |

> Read [ARCHITECTURE.md](ARCHITECTURE.md) before making structural changes.

---

## Coding Standards

- **TypeScript**: All new code must be TypeScript. Minimize use of `any`.
- **Permissions**: Any VFS or kernel operation must use a valid `appId` and respect the permission model.
- **Events**: Use the `eventBus` for cross-layer communication, not direct function calls.
- **State**: All shared state goes through `osStore`. No component-local state for OS-level concerns.
- **Tests**: Add tests for kernel-level changes. Place them in `kernel/tests/` with `.test.ts` suffix.
- **Comments**: Preserve all existing comments and docstrings unrelated to your changes.

---

## Pull Request Process

1. Ensure all validation steps pass (`typecheck`, `test`, `build`)
2. Update documentation if your change affects APIs, architecture, or user-facing behavior
3. Write a clear PR title: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
4. Link related issues
5. Describe what changed, why, and any tradeoffs
6. One PR per logical change — avoid combining unrelated modifications

---

## Contribution Areas

### High Impact

- Kernel hardening (permissions, VFS safety)
- Autonomy governance (policy engine, approval gates)
- Test coverage (kernel, store, shell)
- Architecture decomposition (App.tsx, osStore.ts)

### Medium Impact

- New built-in applications
- Terminal commands
- Theme engine improvements
- Documentation

### Exploratory

- Self-evolution pipeline (propose → validate → stage → deploy → rollback)
- Anomaly detection and health metrics
- Advanced memory architecture

---

## Getting Help

- Check [existing issues](https://github.com/AFKmoney/nexusOS/issues) for similar problems
- Read the [Architecture docs](ARCHITECTURE.md) for context
- Open a discussion issue if you need guidance

---

## Recognition

All contributors are recognized in our project documentation. Your contributions help build a more sovereign, intelligent future for computing.

---

<div align="center">
  <em>"Every line of code is a step toward digital sovereignty."</em>
</div>