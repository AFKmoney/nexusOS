# NexusOS — Build and Release Reference

This document describes the build pipeline, the Electron packaging configuration, the NexusPortable mobile build pipeline, and the release-validation procedure as implemented in the repository at version 2.0.6. The desktop pipeline is manual; the Android APK is built automatically by GitHub Actions on every version tag.

---

## 1. Build entry points

| Command | Purpose | Output |
|---|---|---|
| `npm run dev` | Vite dev server | http://localhost:3000 (HMR enabled) |
| `npm run build` | Production renderer bundle | `dist/` |
| `npm run typecheck` | TypeScript verification | exit code |
| `npm test` | Node test runner | TAP stream, exit code |
| `npm run electron:dev` | Vite + Electron in parallel | live desktop window |
| `npm run electron:build` | Vite build + electron-builder NSIS package | `dist_electron/NexusOS_Setup_<version>.exe` |

The dev and build paths share the same Vite configuration (`vite.config.ts`). The Electron path adds packaging through `electron-builder.yml`.

---

## 2. Renderer build (Vite)

### 2.1 Configuration

`vite.config.ts` declares:

- React plugin via `@vitejs/plugin-react`.
- Manual chunk splitting: `vendor` (React + Zustand), `ui` (Tailwind + Lucide icons), `utils` (sanitization, date helpers).
- Server port 3000.
- Tailwind 3.4 and PostCSS 8 in the asset pipeline.
- TypeScript 5.8 with the strict configuration in `tsconfig.json`.

### 2.2 Bundle structure

The current production bundle produces (gzipped figures in parentheses):

| Asset | Size | Gzipped |
|---|---|---|
| `index.html` | 3.4 KB | 1.5 KB |
| `index-<hash>.css` | 112 KB | 16 KB |
| `vendor-<hash>.js` | 12 KB | 4 KB |
| `ui-<hash>.js` | 81 KB | 16 KB |
| `utils-<hash>.js` | 23 KB | 9 KB |
| `appRegistry-<hash>.js` | 397 KB | 98 KB |
| `index-<hash>.js` | 650 KB | 195 KB |

Vite emits a chunk-size warning for assets above 500 KB. The two assets above the threshold (`appRegistry` and `index`) hold the 52 application components and the kernel respectively. Reducing them is tracked as a performance work item; the recommended approach is route-based code splitting through `React.lazy()` for individual application windows.

### 2.3 Known build warnings

- The `services/localBrain.ts` module is both statically imported (by application components) and dynamically imported (by `kernel/aiPipelineBridge.ts` and `kernel/daemonBridge.ts`). Vite emits a notice that the dynamic import does not move the module into a separate chunk. This is expected and acceptable; resolving it would require a refactor of the import graph.
- `compression: store` in `electron-builder.yml` favors install speed over installer size.

---

## 3. TypeScript configuration

`tsconfig.json` enables:

```
target: ES2022
module: ESNext
moduleResolution: bundler
strict: true
noImplicitAny: true
noUncheckedIndexedAccess: true
exactOptionalPropertyTypes: true
allowImportingTsExtensions: true
isolatedModules: true
moduleDetection: force
```

`baseUrl` and the path alias `@/*` are present and currently produce a TypeScript 7.0 deprecation notice; `ignoreDeprecations: "5.0"` suppresses the warning. When TypeScript 7 lands, the alias should be replaced with package-relative paths or with a Vite alias.

`@types/node` is installed via the dependency tree. Direct addition is not currently required.

---

## 4. Electron packaging

### 4.1 Builder configuration

`electron-builder.yml`:

```yaml
appId: com.daemon.nexusos
productName: NexusOS
compression: store
output: dist_electron
buildResources: build
icon: public/nexus_logo.png

win:
  target: nsis
  icon: public/nexus_logo.png

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  shortcutName: NexusOS
  artifactName: "NexusOS_Setup_${version}.${ext}"
  deleteAppDataOnUninstall: true
```

### 4.2 Packaging flow

`npm run electron:build` runs:

1. `npm run build` — produces `dist/`.
2. `electron-builder` — packages `dist/` plus `electron-main.cjs`, `preload.cjs`, `daemon-bridge-server.cjs`, and configured assets into an NSIS installer.

The installer name is derived from `package.json` version: `NexusOS_Setup_2.0.5.exe`. The release readiness test (`kernel/tests/releaseReadiness.test.ts`) asserts that the version regex, the artifact name, and the README references are aligned.

### 4.3 Code signing

The Windows installer is currently **unsigned**. SmartScreen displays a publisher warning on first launch which the user dismisses through *More info → Run anyway*. Code signing is on the roadmap; setting it up requires:

- An OV or EV code-signing certificate from a recognized CA.
- Configuration of `electron-builder.yml` with `win.certificateFile` and `win.certificatePassword` (or environment variables) or a hardware token integration.
- A CI runner with secure secret storage if signing is automated.

### 4.4 Native bridge components

The Electron build includes three CommonJS files at the repository root:

| File | Role |
|---|---|
| `electron-main.cjs` | Electron main process. Owns `BrowserWindow` creation, IPC handlers, and the `nexus://` protocol handler. |
| `preload.cjs` | Context-isolated bridge exposing a fixed `window.electron` allow-list to the renderer. |
| `daemon-bridge-server.cjs` | Localhost-bound HTTP/WebSocket server (port 3001) for background command execution. |

These files are CommonJS because the Electron main process expects CommonJS by default. They are not bundled by Vite and are not part of the `dist/` directory.

---

## 4.5 Release naming contract

The following invariants are enforced by `kernel/tests/releaseReadiness.test.ts` and must be preserved across releases:

- product name: `NexusOS` (set in `electron-builder.yml`)
- artifact name: `NexusOS_Setup_${version}.${ext}` (set in `electron-builder.yml`)
- `package.json` `name` field is `nexusos` (lowercase).
- `package.json` `version` field follows semantic versioning under the `2.x` line.

If any of these diverge, the release readiness test fails and the validation triplet does not pass.

---

## 5. Release validation procedure

The recommended local validation sequence before publishing a release:

1. **Verify version coherence.** Confirm `package.json`, `package-lock.json`, the README badge, and any in-app version reference are aligned.

2. **Run the validation triplet.**
   ```
   npm run typecheck
   npm test
   npm run build
   ```
   All three must pass.

3. **Build the installer.**
   ```
   npm run electron:build
   ```

4. **Inspect the artifact.** In `dist_electron/`, verify:
   - The installer name matches `NexusOS_Setup_<version>.exe`.
   - The product name in the installer wizard is `NexusOS`.
   - The icon matches `public/nexus_logo.png`.
   - The application launches successfully.
   - The application reaches the login screen and accepts a login.
   - The DAEMON bridge boots and the autonomy log shows activity.

5. **Smoke test the major surfaces:**
   - Open File Explorer; create, rename, delete a file.
   - Open Terminal; run `ls`, `cat`, `mkdir`.
   - Open HyperIDE; edit a file and save.
   - Open Settings → AI Providers; configure a provider; verify a request returns.

6. **Tag and publish.**
   ```
   git tag v<version>
   git push origin v<version>
   ```
   Upload the installer to the GitHub release page.

---

## 6. Known release gaps

The repository does not currently provide:

- Automated artifact validation tests after build.
- Code signing for the Windows installer.
- macOS or Linux installers. Both are supported by `electron-builder` but are not configured.
- A release checklist enforced by tooling. The desktop procedure above is manual.
- The Android APK CI pipeline exists (`.github/workflows/build-android-apk.yml`) but the signed release APK requires the keystore secrets to be configured in the repository settings.

These gaps are tracked in `docs/TOOLING_CLEANUP_PLAN.md` and addressed incrementally.

---

## 7. Practical notes

- `compression: store` is fast and predictable. If installer size becomes a concern (current installer is approximately 100 MB), switch to `maximum` and accept the build-time cost.
- The `appId` must remain stable across releases; changing it produces a new installation rather than an upgrade.
- The NSIS installer respects the user's choice of installation directory because `allowToChangeInstallationDirectory: true` is set.
- `deleteAppDataOnUninstall: true` removes user data on uninstall. Users who want to preserve their data across uninstall/reinstall should back up the user-data directory manually.
- The `nexus://` protocol is registered at runtime by the main process; protocol associations are not affected by uninstall.

---

## 8. NexusPortable — Mobile PWA and Android APK

NexusPortable is a standalone React 19 + Vite 6 PWA located in `NexusPortable/`. It shares no Electron dependencies and runs in any modern mobile browser or as a native Android app via Capacitor.

### 8.1 Build entry points

| Command | Working directory | Purpose | Output |
|---|---|---|---|
| `npm run dev` | `NexusPortable/` | Vite dev server | `http://localhost:5173` |
| `npm run build` | `NexusPortable/` | Production web bundle | `NexusPortable/dist/` |
| `npx cap sync android` | `NexusPortable/` | Sync web assets to Android project | `NexusPortable/android/` |
| `./gradlew assembleDebug` | `NexusPortable/android/` | Build unsigned debug APK | `android/app/build/outputs/apk/debug/` |
| `./gradlew assembleRelease` | `NexusPortable/android/` | Build signed release APK | `android/app/build/outputs/apk/release/` |

### 8.2 Local APK build (requires Android Studio)

1. Install Android Studio and accept the SDK licenses for API 36.
2. Clone the repository and install dependencies:
   ```bash
   cd NexusPortable
   npm install
   npm run build
   npx cap sync android
   ```
3. Open `NexusPortable/android/` in Android Studio, or build from the command line:
   ```bash
   cd NexusPortable/android
   ./gradlew assembleDebug
   ```
4. The APK is output to `app/build/outputs/apk/debug/app-debug.apk`.
5. Install on a device with `adb install app-debug.apk`, or transfer and open on the device directly.

### 8.3 Automated APK build (GitHub Actions)

The workflow `.github/workflows/build-android-apk.yml` runs on every version tag push:

```
git tag v2.0.6
git push origin v2.0.6
```

It produces:
- **Debug APK** — always built; attached as an Actions artifact (30-day retention).
- **Signed release APK** — built only when the following repository secrets are configured:

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | Base64-encoded `.jks` or `.keystore` file |
| `STORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias |
| `KEY_PASSWORD` | Key password |

To generate a keystore for the first time:
```bash
keytool -genkey -v -keystore nexusos-release.jks \
  -alias nexusos -keyalg RSA -keysize 2048 -validity 10000
base64 -w 0 nexusos-release.jks   # paste output into KEYSTORE_BASE64 secret
```

### 8.4 Capacitor configuration

`NexusPortable/capacitor.config.ts` controls the Android build:

- `appId: 'com.daemon.nexusos'` — stable across releases; changing it produces a new install.
- `webDir: 'dist'` — always run `npm run build` before `cap sync`.
- `server.androidScheme: 'https'` — required for `localStorage` and `IndexedDB` to work in WebView.
- `android.allowMixedContent: false` — enforced for security.

### 8.5 Mobile-specific requirements

- **Safe-area insets** — `env(safe-area-inset-*)` CSS variables are applied throughout `index.css`; the HTML `<meta name="viewport">` includes `viewport-fit=cover`.
- **Input font size** — all inputs use `font-size: 16px` to prevent iOS Safari from auto-zooming.
- **Touch optimization** — `touch-action: manipulation` on all interactive elements; `-webkit-tap-highlight-color: transparent` on the shell root.
- **PWA manifest** — `NexusPortable/manifest.json` declares `display: standalone`, `orientation: portrait`, and shortcuts for DAEMON Chat and Terminal.

### 8.6 Bundle size

Current NexusPortable production bundle (gzipped):

| Asset | Raw | Gzipped |
|---|---|---|
| `index.css` | 28.5 KB | 6.7 KB |
| `lucide-*.js` | 40.6 KB | 8.7 KB |
| `index-*.js` | 351.5 KB | 96.7 KB |
| **Total** | **~421 KB** | **~112 KB** |

The bundle fits comfortably within Capacitor's WebView; no lazy-loading is required at this scale.
