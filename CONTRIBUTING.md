# Contributing to NexusOS

Thank you for your interest in NexusOS. This document describes how to contribute changes to the codebase. Read it before opening your first pull request.

NexusOS is an experimental operating environment with strong architectural commitments (see [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md)). Contributions that respect those commitments are welcome regardless of size.

---

## 1. Code of conduct

Participation in this project is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, constructive, and assume good faith.

---

## 2. Channels

| Purpose | Channel |
|---|---|
| Bug reports | [GitHub Issues](https://github.com/AFKmoney/nexusOS/issues) with the `bug` label |
| Feature proposals | GitHub Issues with the `feature request` label |
| Architectural discussion | GitHub Issues with the `discussion` label |
| Documentation corrections | Pull requests directly against the relevant `.md` file |
| Security concerns | Open a private security advisory through GitHub |

When reporting a bug, include:

- The runtime mode (web or Electron) and version.
- Browser or Electron version.
- Steps to reproduce, expected behavior, observed behavior.
- Console output, screenshots, or logs from the Dashboard's autonomy log if relevant.

---

## 3. Development environment

### 3.1 Requirements

- Node.js 18 or later (Node 20+ recommended).
- npm 9 or later.
- Git.
- For desktop builds: a working Electron build toolchain (Visual Studio Build Tools on Windows, Xcode CLI on macOS, build-essential on Linux).

### 3.2 Initial setup

```
git clone https://github.com/AFKmoney/nexusOS.git
cd nexusOS
npm install
```

### 3.3 Running locally

```
npm run dev              # Vite dev server on http://localhost:3000
npm run electron:dev     # Vite + Electron in parallel (desktop)
```

The dev server supports hot module replacement. The Electron variant additionally rebuilds the native bridge whenever `electron-main.cjs`, `preload.cjs`, or `daemon-bridge-server.cjs` change.

---

## 4. Validation

Every pull request must pass the three mandatory validation steps:

```
npm run typecheck        # tsc --noEmit, strict mode
npm test                 # node:test runner — 39 tests
npm run build            # Vite production bundle
```

If your change touches Electron or the native bridge, additionally run:

```
npm run electron:build   # Vite build + electron-builder NSIS package
```

A pull request that fails any of the three mandatory steps will not be reviewed until the failure is addressed. Failures introduced by an unrelated regression on `main` are an exception; flag them in the PR description.

---

## 5. Architectural awareness

Before modifying code, identify which layer the change belongs in. The architecture is layered (see [ARCHITECTURE.md](ARCHITECTURE.md)) and changes should remain local to a layer where possible.

| Layer | Directory | Strategic files |
|---|---|---|
| Shell UI | `App.tsx`, `components/`, `apps/` | `App.tsx`, `components/Taskbar.tsx`, `components/StartMenu.tsx` |
| State | `store/` | `osStore.ts`, `osStoreSlices.ts` |
| Kernel | `kernel/` | `fileSystem.ts`, `permissions.ts`, `autonomy.ts`, `commander.ts`, `osManifest.ts`, `eventBus.ts` |
| Services | `services/` | `localBrain.ts`, `aiProviders.ts` |
| Native | repo root | `electron-main.cjs`, `preload.cjs`, `daemon-bridge-server.cjs` |

A change that crosses layer boundaries should explain its reasoning in the PR description.

---

## 6. Coding standards

### 6.1 Language and types

- All new code is TypeScript. JavaScript is allowed only in the Electron main process where the runtime expects CommonJS.
- The TypeScript configuration is strict (`strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). New code must compile without lowering these flags.
- `any` is permitted only with a comment explaining why. Prefer `unknown` with a narrowing guard.
- `@ts-ignore` and `@ts-expect-error` should be the last resort and must include a comment with a tracking link or rationale.

### 6.2 Permissions and capabilities

- Every VFS or kernel operation must use a valid `appId`. Operations originating in built-in applications must use the application's own id; system-internal operations may use `SYSTEM_VFS_APP_ID = '__system__'` and must justify the use.
- Application manifests in `appRegistry.ts` must declare every capability they require. Do not bypass the permission system through runtime overrides except through `permissions.grant()` with a corresponding `revoke()`.

### 6.3 Cross-layer communication

- Use the event bus (`kernel/eventBus.ts`) for cross-layer notifications. Do not import shell components from kernel modules.
- Shared state lives in the Zustand store (`store/osStore.ts`). Component-local state is appropriate for purely visual concerns; OS-level state is not.
- Avoid circular imports between `kernel/` and `services/`. The dependency direction is `services → kernel`, not the reverse.

### 6.4 Comments

- Default to writing no comment. Add one only when the *why* is non-obvious: a hidden constraint, a workaround, a security-relevant invariant.
- Do not write comments that describe what the code does; well-named identifiers suffice.
- Do not reference the current PR, ticket, or contributor in code comments.

### 6.5 Tests

- Add a test for any kernel-level change. Place tests under `kernel/tests/` with a `.test.ts` suffix; the runner discovers them automatically.
- Tests must be deterministic. They must not depend on real network calls, real timers (use fakes), or the real filesystem outside the VFS abstraction.
- Tests must close any resources they open. The runner force-exits after a 3-second grace window, but a leaking test still pollutes other tests' state.

### 6.6 Style

- The repository does not currently enforce a code style through CI. New code should match surrounding style: two-space indentation, single quotes for strings, trailing commas in multi-line literals, no semicolon-leading lines.
- Imports are grouped: third-party, then internal absolute, then internal relative.

---

## 7. Pull request process

1. Fork the repository and create a feature branch:
   ```
   git checkout -b feature/<short-name>
   ```
   Branch name conventions: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`, `perf/`, `chore/`.

2. Make your changes. One PR addresses one logical change. If you find unrelated improvements while working, open a separate PR.

3. Run validation locally:
   ```
   npm run typecheck && npm test && npm run build
   ```

4. Update documentation when the change affects behavior, APIs, or user-visible features. Documentation drift is a regression.

5. Commit with a conventional message:
   ```
   feat: add per-agent capability scope to permissions module
   fix: prevent autonomy scheduler from halting on a single tick rejection
   docs: realign VFS specification with IndexedDB persistence
   refactor: extract window slice from monolithic osStore
   ```

6. Push and open a pull request. The PR description should include:
   - **What** changed.
   - **Why** the change is needed.
   - **How** the change was validated (which tests, manual scenarios).
   - **Trade-offs** or known limitations introduced.

7. Respond to review feedback. Maintainers may request architectural changes if a PR conflicts with the autonomy-roadmap commitments; in that case the PR description should clarify the intent so the discussion can converge.

---

## 8. Documentation contributions

Documentation is treated as code. The same review standards apply:

- Documentation must reflect the implementation, not aspiration. Aspirational claims belong in [`docs/AUTONOMY_ROADMAP.md`](docs/AUTONOMY_ROADMAP.md).
- Numerical claims (file counts, application counts, action counts) must be verifiable from the source. If you change one of these counts, update every document that references it.
- Avoid marketing tone. Describe what the system does, not what is exciting about it.

---

## 9. Contribution areas

### 9.1 High-impact

- **Kernel hardening** — extending the permission set with `shell.exec`, `agent.spawn`, `model.swap`, `vfs.delete`, `network.fetch.<host>`, `process.kill`; per-agent capability scopes; signed agent manifests.
- **Autonomy governance** — strengthening `mirrorGuard` policy enforcement; AI-supervisor pattern (a second model auditing autonomy decisions before dispatch); structured proposal step before destructive actions.
- **Reversibility** — VFS snapshot-before-mutation; git auto-commit hooks for AI-generated changes; auto-revert when `errorGuard` flags a regression.
- **Test coverage** — kernel modules without dedicated test files (autonomy, commander, mirrorGuard, eventBus, processManager); store-slice tests; Electron main-process tests.
- **Architecture decomposition** — thinning `App.tsx` into smaller coordinators; splitting the monolithic store into per-domain slices.

### 9.2 Medium-impact

- New built-in applications.
- Additional terminal commands.
- Theme presets and theme-engine improvements.
- Performance optimization (token streaming UI, window-focus re-render storms).
- CI/CD pipeline configuration (GitHub Actions running the validation triplet on every PR).

### 9.3 Exploratory

- Self-evolution pipeline (propose → validate → stage → deploy → rollback).
- Anomaly detection and runtime health metrics.
- Advanced memory architecture (vector compression, hierarchical recall, cross-session memory).
- Mobile PWA shell sharing the kernel.

---

## 10. Release versioning

NexusOS uses semantic versioning at the major and minor levels. Patch versions are bumped on every published Electron build.

- Major version: backward-incompatible kernel or VFS changes.
- Minor version: new capabilities or new applications.
- Patch version: bug fixes, security hardening, dependency bumps.

Versions are reflected in `package.json`, `package-lock.json`, the README badge, and the installer artifact name (`NexusOS_Setup_<version>.exe`). When bumping, update all four together; the test suite validates the regex.

---

## 11. Recognition

Contributors are recognized in pull-request history and (with their consent) in the project's published release notes. Significant architectural contributions are acknowledged in the relevant document under a `## Acknowledgements` section.

---

## 12. License

By submitting a contribution you agree that it will be licensed under the project's [MIT License](LICENSE).
