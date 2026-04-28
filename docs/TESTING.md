# Testing

This document is a current-state, evidence-based summary of how testing is wired in this repository.

## What exists today

### Primary test entry point

The only explicit test script in `package.json` is:

- `npm test` → `npx tsx kernel/tests/runTests.ts`

That means the test runner is currently centered on `kernel/tests/runTests.ts`.

### Available test directories

The repository currently contains discoverable test files under `kernel/tests`:

- `kernel/tests/errorGuard.test.ts`
- `kernel/tests/fileSystem.test.ts`
- `kernel/tests/generatedRuntimeCoverage.test.ts`
- `kernel/tests/osManifest.test.ts`
- `kernel/tests/permissions.test.ts`
- `kernel/tests/releaseReadiness.test.ts`
- `kernel/tests/store.test.ts`
- `kernel/tests/runTests.ts`

There is also a utility test directory present in the repo tree:

- `utils/tests/uuid.test.ts`

## What this means in practice

Based on the current scripts and file layout:

- There is a dedicated test command and there are real test files present in the repo.
- The current automated coverage is still concentrated around kernel/store/release-readiness concerns rather than broad UI/e2e flows.
- The repo does have a general build/typecheck toolchain:
  - `npm run build` → Vite production build
  - `npm run typecheck` → `tsc --noEmit`
- Those are useful validation steps, but they are not substitutes for actual automated tests.

## Current coverage: what can be said honestly

The repository has direct evidence of coverage in the following areas:

- `ErrorGuard` validation behavior
- virtual file system behavior and permission enforcement
- generated runtime coverage around registry/window/store paths
- OS manifest generation
- kernel permission handling
- release-readiness and branding alignment checks
- deterministic store default/id behavior

This is meaningful coverage for core platform primitives, but it is still not the same as full product confidence.

## Obvious gaps

The current setup still has several visible gaps:

1. **No obvious unit/integration/e2e split**
   - There is only one test script.
   - No separate commands were visible for unit, integration, or UI/electron testing.

3. **Coverage is concentrated in core runtime areas**
   - The visible tests are mostly around kernel/store/runtime invariants.
   - There is not yet strong evidence of broad application-level workflow coverage.

4. **No visible CI test matrix from the files inspected here**
   - I did not inspect `.github` in this task, so I cannot claim CI coverage.
   - From the files checked, nothing in `package.json` suggests a richer pipeline than `npm test`, `typecheck`, and `build`.

## Realistic validation order

For day-to-day validation, a cautious order would be:

1. **Type check**
   - `npm run typecheck`
   - Catches TypeScript contract issues early.

2. **Production web build**
   - `npm run build`
   - Confirms the Vite app compiles for production.

3. **Run the test entry point**
   - `npm test`
   - This is the repository’s explicit test script and should be run after typecheck/build.

4. **Electron dev smoke check**
   - `npm run electron:dev`
   - Only if you need to verify app startup and shell integration locally.

5. **Electron packaging check**
   - `npm run electron:build`
   - Use this as a release-readiness gate after the web build and test command pass.

## Recommended minimum before release

A cautious minimum is:

- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run electron:build` for packaged release verification

## Notes on evidence

This document is intentionally conservative:

- It reflects what was directly visible in `package.json`, the repository file listing, and the currently observed test execution output.
- It does not claim UI smoke coverage, end-to-end desktop coverage, or broad app-by-app validation beyond what the visible tests prove.
- If more app-level tests are added, this document should be expanded with a coverage map by subsystem.
