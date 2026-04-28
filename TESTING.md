# TESTING.md

## Purpose

This document describes the current test entry points and the known testing surface of NexusOS as it exists in this repository.

## Primary test commands

### Kernel / core tests
- `npm test`
- This runs:
  - `npx tsx --test kernel/tests/runTests.ts`

### Type checking
- `npm run typecheck`
- Runs:
  - `tsc --noEmit`

### Production build smoke check
- `npm run build`
- Uses Vite production build as a practical smoke check for renderer compilation

### Electron packaging smoke check
- `npm run electron:build`
- Packages the app after the renderer build and is the closest release-oriented validation currently available from scripts

## Existing test harness

The repo already includes a kernel test runner:
- `kernel/tests/runTests.ts`

The runner auto-discovers every file under `kernel/tests/` that ends in `.test.ts` and imports each one before executing the Node test run. That means adding a new `*.test.ts` file in that directory is enough for it to be picked up by `npm test`.

And tests currently present in the repo include:
- `kernel/tests/errorGuard.test.ts`
- `kernel/tests/fileSystem.test.ts`
- `kernel/tests/osManifest.test.ts`
- `utils/uuid.test.ts`
- `utils/tests/uuid.test.ts`

## What the current tests appear to cover

Based on file names and location, the test surface currently includes:
- error guard behavior
- file system behavior
- OS manifest / registry expectations
- UUID utility behavior

The exact assertions should be read directly from the individual test files before extending the suite.

## Known gaps in the testing surface

The repository currently does **not** provide strong evidence of:
- browser UI component tests
- Electron main-process tests
- end-to-end workflow tests
- permission-model tests beyond core/kernel logic
- store migration tests
- release packaging tests
- screenshot or visual regression tests

## Recommended test priorities

If extending the suite incrementally, the highest-value areas are:

1. `kernel/permissions.ts`
2. `kernel/fileSystem.ts`
3. `store/osStore.ts`
4. `appRegistry.ts`
5. critical shell bootstrap paths in `App.tsx`

## Notes on determinism

For reliability, tests should avoid:
- browser timing assumptions
- random UI state
- external APIs
- real filesystem dependencies outside the repo’s VFS abstractions
- live network calls

## How to use the test commands

A practical local validation sequence is:

1. `npm run typecheck`
2. `npm test`
3. `npm run build`

If Electron packaging is being validated too:

4. `npm run electron:build`

## Current testing reality

The repo has a real core test harness, but it is still narrower than the product surface. The most accurate summary is:

- core logic testing exists
- file-system and manifest-related tests exist
- UUID utility coverage exists in two locations
- broader shell/UX/release coverage is still incomplete

## Maintenance note

If new tests are added, place them under `kernel/tests/` with a `.test.ts` suffix so the runner will auto-discover them. Keep new tests deterministic and focused on stable logic.