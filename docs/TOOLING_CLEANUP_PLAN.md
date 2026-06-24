# Tooling Cleanup Plan

## Scope
This note captures config-standardization and dependency-hygiene items visible in the repo’s top-level configs and `package-lock.json`.

## Evidence-based findings

### 1) Dependency duplication / version drift
The lockfile shows a few packages appearing both as direct deps and transitive copies, or in multiple versions:

- `dotenv`
  - direct devDependency: `^17.3.1`
  - transitive copies also appear under Electron packaging tooling:
    - `app-builder-lib` uses `dotenv` `16.6.1`
- `fs-extra`
  - multiple locked versions are present:
    - `8.1.0`
    - `9.1.0`
    - `10.1.0`
    - `11.3.4`
- `semver`
  - multiple locked versions are present:
    - `5.7.2`
    - `6.3.1`
    - `7.7.4`
- `minimatch`
  - multiple locked versions are present:
    - `3.1.5`
    - `5.1.9`
    - `9.0.5`
    - `10.2.4`
- `jiti`
  - multiple locked versions are present:
    - `1.21.7`
    - `2.6.1`
- `glob`
  - multiple locked versions are present:
    - `7.2.3`
    - `10.5.0`

These are not necessarily problems by themselves, but they indicate the dependency tree is not fully deduplicated.

### 2) Direct dependency overlap
`@types/dompurify` is listed in both `dependencies` and `devDependencies` in `package.json` and also appears in the lockfile root package metadata. Since this package is a type-only package, it is a good candidate to keep only in `devDependencies` unless there is a deliberate runtime requirement.

### 3) Visible deprecated packages in the lockfile
The lockfile includes several packages with explicit `deprecated` markers:

- `glob@7.2.3`
  - deprecated note warns that old versions are unsupported and contain security vulnerabilities
- `inflight@1.0.6`
  - deprecated note says the module is not supported and leaks memory
- `node-domexception@1.0.0`
  - deprecated note says to use the platform’s native `DOMException`
- `rimraf@2.6.3`
  - deprecated note says versions prior to v4 are no longer supported
- `boolean@3.2.0`
  - deprecated note says the package is no longer supported

Most of these are transitive dependencies, so the immediate action is to identify which top-level package is pulling them in and whether that top-level package can be upgraded.

### 4) Config naming / style inconsistencies
A few config files use different naming and formatting conventions:

- `electron-builder.yml`
  - uses `appId: com.daemon.nexusos`
  - uses `shortcutName: "NexusOS"` and `artifactName: "NexusOS_Setup_${version}.${ext}"`
  - product branding is consistently `NexusOS`, but the app ID namespace is `com.daemon.nexusos`, which does not match the product name casing/style
- `manifest.json`
  - uses `name` / `short_name` in lowercase snake case as required by web manifest schema
  - this is standard for the file format, but it differs from the camelCase style used in JS/TS config files
- `vite.config.ts`
  - `define` includes both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`
  - this duplicates the same env value under two keys, which can become a maintenance issue
- `package.json`
  - package name is `NexusOS`
  - lockfile root package name is `nexusos`
  - the mismatch is harmless at runtime but indicates naming inconsistency between package metadata and lockfile output

### 5) Top-level config style consistency
The repo’s top-level tool configs are a mix of formats:

- `.eslintrc.js` uses CommonJS
- `vite.config.ts` uses ESM/TypeScript
- `electron-builder.yml` uses YAML
- `manifest.json` uses JSON

That mix is acceptable, but within each file there are small style differences:
- `vite.config.ts` has one `define` entry without a trailing comma and one object branch without consistent trailing commas compared to the rest of the repo’s JSON/YAML style.
- `.prettierrc` is JSON and already consistent.
- `tsconfig.json` is JSON and already consistent.

## Recommended cleanup actions

### Priority 1: Reduce visible deprecation exposure
1. Trace the packages that bring in:
   - `glob@7.2.3`
   - `inflight@1.0.6`
   - `rimraf@2.6.3`
   - `boolean@3.2.0`
2. Prefer upgrades of the parent packages instead of adding direct overrides unless necessary.
3. Re-run install/lock refresh after upgrades and confirm the deprecated entries disappear or are reduced.

### Priority 2: Deduplicate overlapping direct deps
1. Keep `@types/dompurify` in `devDependencies` only, if no runtime code requires it.
2. Review whether any other package is intentionally duplicated in root metadata versus transitive install paths.
3. Use a lockfile refresh after version alignment to collapse duplicate subtrees where possible.

### Priority 3: Normalize naming across configs
1. Decide whether `electron-builder.yml` should keep `com.daemon.nexusos` or be aligned to a product-oriented namespace.
2. Keep branding keys (`productName`, `shortcutName`, `artifactName`) aligned to `NexusOS`.
3. In `vite.config.ts`, consider using one canonical env key instead of both `API_KEY` and `GEMINI_API_KEY` aliases.
4. Keep package naming consistent between `package.json` and lockfile generation by ensuring the package name casing strategy is intentional.

### Priority 4: General maintenance
1. Audit the direct dependency set for any packages that can be moved to dev-only scope.
2. Re-run `npm dedupe` or equivalent after targeted upgrades, then inspect the lockfile for remaining duplicate major versions.
3. Keep config formatting aligned with the repo’s existing formatter expectations.

## Notes
- This audit intentionally avoids claiming issues that were not visible in the repo or lockfile.
- Some deprecated packages are transitive; fixing them may require upstream dependency upgrades rather than direct edits to root `package.json`.