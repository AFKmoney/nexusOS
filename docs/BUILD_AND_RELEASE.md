# Build and Release

This document describes the current build and release state of the repository based on the files inspected in the repo root, `package.json`, and `electron-builder.yml`.

## Current build model

The project has two relevant build paths:

1. **Web build**
   - `npm run build` → `vite build`
   - This produces the frontend production bundle in `dist/`

2. **Electron packaging**
   - `npm run electron:build` → `npm run build && electron-builder`
   - This packages the Vite output together with Electron entry files into an installer.

## Current scripts

From `package.json`, the available scripts are:

- `npm run dev` → `vite`
- `npm run build` → `vite build`
- `npm run typecheck` → `tsc --noEmit`
- `npm run preview` → `vite preview`
- `npm run electron:dev` → `concurrently "npm run dev" "wait-on http://localhost:3000 && electron ."`
- `npm run electron:build` → `npm run build && electron-builder`
- `npm test` → `npx tsx kernel/tests/runTests.ts`

## Electron packaging state

The current `electron-builder.yml` contains:

- `appId: com.daemon.nexusos`
- `productName: NexusOS`
- `compression: store`
- `directories.output: dist_electron`
- `directories.buildResources: build`
- packaged files:
  - `dist/**/*`
  - `electron-main.cjs`
  - `preload.cjs`
  - `package.json`
- Windows target:
  - `nsis`
- Windows icon:
  - `public/nexus_logo.png`
- NSIS installer settings:
  - `oneClick: false`
  - `allowToChangeInstallationDirectory: true`
  - `shortcutName: "NexusOS"`
  - `artifactName: "NexusOS_Setup_${version}.${ext}"`
  - `deleteAppDataOnUninstall: true`

## What this means operationally

### Web build
The web build is straightforward and likely the first release gate:

- If `vite build` succeeds, the frontend bundle is at least syntactically and bundling-wise valid.
- This does not guarantee runtime correctness in Electron, but it is the base artifact for packaging.

### Electron packaging
Packaging depends on:

- a successful web build into `dist/`
- `electron-main.cjs`
- `preload.cjs`
- `package.json`

Because `electron-builder.yml` only includes those files, any runtime dependency on files outside that set will not be packaged unless they are already bundled into `dist/` or otherwise accessible.

## Known risks and constraints

These are cautious, evidence-based risks from the current config:

1. **Single-platform packaging appears Windows-focused**
   - The only explicit target shown is `win -> nsis`.
   - No macOS or Linux targets were visible in `electron-builder.yml`.

2. **Packaged file scope is narrow**
   - Only `dist/**/*`, Electron entry points, and `package.json` are included.
   - If the app expects extra runtime assets, they must already be embedded into `dist/` or referenced carefully.

3. **`compression: store` prioritizes build speed over installer size**
   - This reduces compression during packaging, which can speed builds but produces larger artifacts.

4. **Electron dev path depends on port 3000**
   - `electron:dev` waits on `http://localhost:3000`.
   - This assumes Vite is serving on port 3000 in the current configuration or environment.
   - If Vite uses a different port, `electron:dev` may fail or hang waiting.

5. **Installer configuration is manual-install style**
   - `oneClick: false` and `allowToChangeInstallationDirectory: true` indicate a user-facing NSIS installer with installation choices.
   - This is more flexible, but it also means installer behavior should be checked manually before release.

6. **Release confidence currently depends on external validation**
   - There is no evidence in the inspected files of a formal release pipeline, signing setup, or automated installer smoke test.
   - I did not inspect CI in this task, so this document does not assume it exists.

## Cautious release checklist

Before treating a build as releasable, a conservative checklist would be:

1. **Typecheck**
   - `npm run typecheck`

2. **Web production build**
   - `npm run build`

3. **Core test entry point**
   - `npm test`

4. **Local Electron smoke test**
   - `npm run electron:dev`
   - Verify app launch, main window startup, and basic shell behavior.

5. **Package the installer**
   - `npm run electron:build`

6. **Inspect generated artifacts**
   - Confirm the output in `dist_electron/`
   - Verify the installer name matches:
     - `NexusOS_Setup_${version}.${ext}`

7. **Manual install test**
   - Install the generated NSIS package on a clean machine or clean VM profile.
   - Verify:
     - app launches after install
     - uninstall works
     - data removal behavior is acceptable
     - shortcuts are created as expected

8. **Runtime smoke test after install**
   - Verify the app can start without relying on dev-server behavior.
   - Confirm any Electron preload/main-process features still function.

## Recommended release posture

Given the current repo evidence, the safest posture is:

- treat `npm run build` and `npm test` as necessary but not sufficient;
- treat `npm run electron:build` as the final packaging check, not proof of release readiness;
- do a manual Windows installer smoke test before publishing any release artifact.

## Notes on evidence

This document is intentionally conservative and only reflects what was visible in:

- `package.json`
- `electron-builder.yml`

It does not assume hidden build steps, signing, or release automation that were not directly inspected.