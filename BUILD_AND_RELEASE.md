# BUILD_AND_RELEASE.md

## Purpose

This document summarizes the current build and release behavior of NexusOS as implemented in this repository. It is intentionally grounded in the repo’s present configuration and does not claim release maturity beyond what the files support.

## Current build entry points

### Web / renderer build
- `npm run build`
- Uses Vite via `vite build`
- Output is the standard Vite production bundle

### Type check
- `npm run typecheck`
- Runs `tsc --noEmit`

### Electron packaging
- `npm run electron:build`
- Runs `npm run build && electron-builder`

### Electron development
- `npm run electron:dev`
- Intended to run Vite dev server and Electron together

## Current package metadata

From `package.json`:
- `name`: `nexusos`
- `version`: `2.0.0`
- `description`: `The Sovereign Neural Operating System — Locally Inferenced, Globally Distributed.`
- `author`: `Philippe-Antoine Robert`

## Electron builder configuration

From `electron-builder.yml`:
- `appId`: `com.daemon.nexusos`
- `productName`: `NexusOS`
- `compression`: `store`
- `output` directory: `dist_electron`
- `buildResources`: `build`
- Windows target: `nsis`
- Windows icon: `public/nexus_logo.png`
- NSIS installer settings:
  - `oneClick: false`
  - `allowToChangeInstallationDirectory: true`
  - `shortcutName: "NexusOS"`
  - `artifactName: "NexusOS_Setup_${version}.${ext}"`
  - `deleteAppDataOnUninstall: true`

## Recommended release validation sequence

A practical local release check is:

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. If desktop packaging is needed, run `npm run electron:build`
5. Inspect the resulting artifacts in `dist_electron/`
6. Verify:
   - version number
   - product name
   - icon
   - installer name
   - installed app launch behavior

## Known build status

Based on the repo files available here:
- The project has a defined build path for web and Electron.
- The repo includes a `dist/` directory, indicating production output has been generated at least once.
- `package.json` includes build and packaging scripts.
- `electron-builder.yml` is present and coherent at the file level.

What is **not** proven by the files alone:
- that the latest Electron installer builds successfully on this machine
- that all bundled apps are release-ready
- that Windows signing is configured
- that packaging is free of size, asset, or runtime issues
- that the electron packaging output has been smoke-tested after the latest code changes

## Release truth and caution

This document is aligned to the current repository configuration:
- product name: `NexusOS`
- artifact name: `NexusOS_Setup_${version}.${ext}`

Any README or marketing copy that diverges from these values should be updated to match the build configuration. This doc reflects the actual config files rather than older branding references or marketing claims.

## Known release gaps

The repo does not yet provide strong evidence of:
- a formal CI/CD release pipeline
- automated packaging verification
- signing/certificate setup
- a release checklist enforced by tooling
- artifact validation tests after build

## Practical notes

- `compression: store` in electron-builder favors speed and simplicity over compression.
- The Windows target is NSIS, so release documentation should be written around NSIS behavior.
- Because the build output and branding must stay aligned, any future release update should keep `package.json`, `electron-builder.yml`, README references, and installer asset names in sync.
