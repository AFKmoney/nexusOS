# NexusOS — Testing Reference

This document describes the test harness, the current coverage, and the gaps. It is grounded in the present state of the repository at version 2.0.4.

The author of every test must read this document before adding new ones; the harness has specific requirements (Node test runner, browser-shim ordering, force-exit grace window) that are easy to miss.

---

## 1. Validation contract

NexusOS ships three first-party validation steps. Every change must pass all three:

```
npm run typecheck        # tsc --noEmit, strict configuration
npm test                 # node:test runner (kernel/tests/runTests.ts)
npm run build            # Vite production bundle
```

For changes touching the Electron host, additionally:

```
npm run electron:build   # Vite build + electron-builder NSIS package
```

The four commands together constitute the local release-validation sequence.

---

## 2. Test runner

### 2.1 Entry point

`npm test` invokes `npx tsx kernel/tests/runTests.ts`. The runner:

1. Reads `kernel/tests/` for files ending in `.test.ts`.
2. Imports each test file in a sorted order. Each file uses `node:test`'s global `test()` registration.
3. Lets the implicit root suite execute. Output is the standard Node test TAP stream.
4. Schedules a hard `process.exit()` 3 seconds after `main()` resolves.

The 3-second grace window is intentional. The kernel imports browser-targeted modules (notably `services/localBrain.ts` which loads `@wllama/wllama`) that may leave WASM workers, intervals, or `BroadcastChannel` handles open. Without the force exit, the test process would hang indefinitely on CI even though the tests themselves complete in milliseconds.

### 2.2 Adding a test file

Create a file in `kernel/tests/` with a `.test.ts` suffix. The runner picks it up automatically. Use `node:test`:

```ts
import test from 'node:test';
import assert from 'node:assert';
import { something } from '../something.ts';

test('something does the expected thing', () => {
  assert.strictEqual(something(1, 2), 3);
});
```

Imports must use the explicit `.ts` extension because the runner uses `tsx` with `moduleResolution: bundler`.

### 2.3 Browser-global shims

Many kernel modules expect browser globals (`localStorage`, `navigator`, `window`). Tests must shim those globals before the module under test is imported.

The standard shim block, used by `kernel/tests/errorGuard.test.ts` and `kernel/tests/fileSystem.test.ts`:

```ts
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
} as any;

Object.defineProperty(global, 'navigator', {
  value: { hardwareConcurrency: 4 },
  writable: true,
});

if (typeof global.fetch === 'undefined') {
  (global as any).fetch = async () => ({ ok: false, json: async () => ({}) });
}
```

Direct assignment (`global.navigator = { ... }`) fails on Node 22 because `navigator` is a getter-only property; use `Object.defineProperty` with `writable: true`.

### 2.4 Test ordering

Test files run in the order returned by `readdir` after `.sort()`. This means alphabetical order. Tests that establish global shims (`errorGuard.test.ts`) precede tests that consume them (`fileSystem.test.ts`, `osManifest.test.ts`). Be aware of the ordering when adding a test that depends on another file's shims.

---

## 3. Current test files

| File | Asserts |
|---|---|
| `kernel/tests/errorGuard.test.ts` | `OS::` action validation, HTML structure validation (DOCTYPE, closing tags). |
| `kernel/tests/fileSystem.test.ts` | VFS permission enforcement, IndexedDB-fallback behavior, system bypass via `__system__` appId. |
| `kernel/tests/osManifest.test.ts` | `parseOsActions()` grammar, `generateOSManifest()` v3 compressed output across tiers. |
| `kernel/tests/releaseReadiness.test.ts` | `package.json` and `electron-builder.yml` are aligned on the NexusOS branding; `TESTING.md` references the correct validation sequence; runner auto-discovery contract. |
| `kernel/tests/store.test.ts` | `createDefaultStoreState()` shape, `makeStoreId()` determinism. |
| `utils/uuid.test.ts`, `utils/tests/uuid.test.ts` | UUID generation determinism and uniqueness. |

Total: 39 assertions across 6 files. All passing on `main` and `claude/audit-ai-fixes-kbRar`.

---

## 4. Coverage map

| Surface | Covered | Notes |
|---|---|---|
| `kernel/errorGuard.ts` | yes | Action grammar and HTML validation. |
| `kernel/fileSystem.ts` | partial | Permission gates, IndexedDB fallback. Missing: symlink cycle detection, batch operations. |
| `kernel/osManifest.ts` | yes | Parser and tier output. |
| `kernel/permissions.ts` | indirect | Exercised through VFS tests. No dedicated suite. |
| `store/osStore.ts` | partial | Default state and id. Missing: slice mutations, persistence rehydration. |
| `appRegistry.ts` | indirect | Validated through release-readiness assertions. |
| `kernel/autonomy.ts` | none | Mission scoring, command filtering, error swallowing. |
| `kernel/commander.ts` | none | Command dispatch, pipes, redirection. |
| `kernel/mirrorGuard.ts` | none | Action structural validation. |
| `kernel/eventBus.ts` | none | Pub/sub semantics, history retention. |
| `kernel/processManager.ts` | none | PID allocation, lifecycle. |
| `kernel/cronScheduler.ts` | none | Expression parsing, persistent scheduling. |
| `services/localBrain.ts` | none | Inference queue, model lifecycle. |
| `services/aiProviders.ts` | none | Provider routing, streaming. |
| `electron-main.cjs` | none | IPC handlers, native bridge contract. |
| `daemon-bridge-server.cjs` | none | CORS allow-list, WebSocket origin verification, exec validation. |
| Shell components | none | Window manager, taskbar, start menu. |

The dominant gap is autonomy. The autonomy loop is the core of the system's thesis but has no test coverage today; this is a high-priority contribution area.

---

## 5. Known limitations

- **No browser UI tests.** The shell is rendered by React 19; component-level tests would require a browser environment (jsdom + React Testing Library). This has not been wired up.
- **No Electron main-process tests.** The Electron handlers are validated only through manual smoke testing during packaging.
- **No end-to-end tests.** A full open-application → write-file → close-application flow is not exercised automatically.
- **No visual regression.** Screenshot comparison is not configured.
- **No performance assertions.** Bundle size, startup time, and tick latency are not gated.

---

## 6. Determinism rules

Tests must be deterministic. Avoid:

- Real network calls. Mock `fetch` at the test boundary.
- Real timers. The kernel uses `setTimeout` and `setInterval`; tests should fake them or assert without waiting.
- Real filesystem dependencies outside the VFS abstraction. The VFS persists to IndexedDB or `localStorage`; the test environment provides shims.
- Random UI state. Where randomness is necessary (autonomy scoring), pass a deterministic seed.
- Time-dependent assertions. `Date.now()` results should be stubbed or asserted with tolerances.

---

## 7. Recommended local sequence

For most changes:

```
npm run typecheck
npm test
npm run build
```

For desktop changes:

```
npm run typecheck
npm test
npm run build
npm run electron:build
```

For documentation-only changes:

```
npm run typecheck
npm run build
```

(No tests required, but the build must still pass to catch markdown/asset references.)

---

## 8. Maintenance

- New tests go under `kernel/tests/` with a `.test.ts` suffix. The runner auto-discovers them.
- Tests must close resources they open and avoid relying on the 3-second force-exit window for correctness.
- When adding a test that depends on a browser global, verify the shim is in place earlier in the file order.
- When updating numerical claims in test assertions (version regex, file counts), update the corresponding documentation in the same PR.
