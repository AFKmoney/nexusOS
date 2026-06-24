# Bundle Splitting Plan

## Scope reviewed

This plan is grounded in the current app shell and registry structure in:

- `App.tsx`
- `index.tsx`
- `appRegistry.ts`

No code splitting has been implemented here. This document only identifies low-risk, high-value candidates and the main risks to watch before changing the loading model.

## What the current shell is doing

### App bootstrap
- `index.tsx` eagerly imports `App` and mounts it immediately with `ReactDOM.createRoot(...)`.
- There is no route-based shell or staged bootstrap at the entry point.
- The global error handler is installed before rendering, so boot behavior is already centralized.

### App shell
- `App.tsx` imports and renders most shell UI eagerly:
  - `WindowFrame`
  - `TaskSwitcher`
  - `ContextMenu`
  - `StartMenu`
  - `Taskbar`
  - `BootScreen`
  - `LoginScreen`
  - `DesktopWallpaper`
  - `DaemonLockScreen`
  - `NeuralHoloUI`
- The only existing lazy boundary in the shell is:
  - `GlobalSearchOverlay = React.lazy(() => import('./components/GlobalSearch'))`
- The main desktop also imports several kernel/service modules eagerly:
  - `bindOsStore`
  - `toolForge`
  - `sounds`
  - `processManager`
  - `themeEngine`
  - `eventBus`
  - `daemonBridge` side-effect import

### App registry
- `appRegistry.ts` eagerly imports every app component up front.
- This file is the biggest likely contributor to startup bundle size because it pulls in all registered apps even when the user opens only a few of them in a session.
- The registry is a centralized manifest, which makes it a strong candidate for deferred component loading.

## Best code-splitting candidates

### 1) Split app registry components behind lazy imports
**Candidate:** `appRegistry.ts`

**Why it matters**
- This is the clearest high-impact opportunity.
- The registry imports dozens of app bundles immediately, even though many are never opened in a typical session.
- Desktop shell startup currently pays for the whole catalog.

**Recommended approach**
- Convert app `component` references in the manifest to lazy-loaded components or lazy factories.
- Keep the manifest metadata eager:
  - `id`
  - `name`
  - `icon`
  - `permissions`
  - `defaultSize`
  - `description`
- Load app modules only when their window is first opened.

**Expected impact**
- Likely the largest reduction in initial JS payload.
- Better perceived boot time, especially on slower devices or when the Electron renderer is cold-starting.
- Defers parsing/execution cost for rarely used apps.

**Risks**
- The window renderer must support `React.Suspense` or an equivalent loading state when a lazy app is opened.
- Some apps may have side effects at module import time; deferring them can change boot behavior.
- Any code that assumes a component is synchronously available will need to adapt.

**Low-risk note**
- This is the most valuable change, but it is not trivial.
- It should be implemented only after confirming the window host already handles suspense boundaries cleanly.

---

### 2) Split search overlay and other infrequent shell overlays
**Candidate:** `GlobalSearchOverlay` in `App.tsx`

**Current state**
- Already lazy-loaded with `React.lazy`.
- Wrapped in `Suspense fallback={null}`.

**Opportunity**
- Keep this pattern and consider extending it to other overlays that are not needed at boot.
- Good candidates in the shell include:
  - heavy settings panels
  - lock/unlock flows if they are not needed immediately
  - advanced onboarding/help overlays
  - neural/visual overlays if they are purely decorative or rarely shown

**Expected impact**
- Small to moderate improvement.
- Mostly reduces baseline parse cost and makes shell boot a bit lighter.

**Risks**
- Very low if the overlay is not required for first paint.
- Avoid splitting components that are needed for immediate interaction after login.

---

### 3) Defer visually heavy or low-frequency chrome components
**Candidates in `App.tsx`:**
- `NeuralHoloUI`
- `DaemonLockScreen`
- `StartMenu`
- `TaskSwitcher`

**Why these are candidates**
- They appear to be shell chrome or overlay-style UI rather than core boot logic.
- If any of these components are large or import expensive visuals/helpers, lazy loading can reduce startup cost.

**Expected impact**
- Usually modest unless these components pull in substantial dependencies.
- Can help trim the initial render graph.

**Risks**
- Higher UX risk than the app registry split if these are needed immediately after login.
- UI jitter or delayed interaction can happen if they load on first use without a prefetch strategy.
- Some of these components may be small enough that splitting them is not worth the extra chunk overhead.

**Recommendation**
- Profile first.
- Only split if bundle analysis shows real weight or expensive transitive dependencies.

---

### 4) Defer app-specific heavy dependencies inside the registry apps
**Likely candidates based on names alone**
- `VideoPlayerApp`
- `ImageViewerApp`
- `MusicPlayerApp`
- `MarkdownPreviewApp`
- `WebRunnerApp`
- `HyperIDEApp`
- `NeuralForgeApp`
- `ModelManagerApp`
- `WeatherApp`
- `RSSReaderApp`
- `FractalVisualizerApp`
- `ScreenshotToolApp`

**Why they stand out**
- These are feature-rich apps that commonly pull in media, parsing, editor, or visualization code.
- They are often not needed on first boot.

**Expected impact**
- Good secondary gains after registry-level splitting.
- Helps isolate large feature-specific dependencies into separate chunks.

**Risks**
- Same as the registry split, plus the chance that sub-dependencies are shared across multiple apps and become duplicated if not configured well.
- Shared libraries should be extracted carefully to avoid chunk bloat from duplicate vendor code.

## Lower-priority or probably unnecessary splits

### `index.tsx`
- The entry file is already minimal.
- Splitting here would not likely yield meaningful savings unless `App` itself is refactored into staged bootstrap pieces.

### `BootScreen` / `LoginScreen`
- These may be worth splitting only if they are heavy.
- If they are required during the earliest boot phase, keeping them eager is usually better.

### `WindowFrame`
- Probably better to keep eager.
- It is part of the core windowing path and is likely used frequently enough that lazy loading would add latency without much benefit.

## Suggested implementation order

1. **Add bundle analysis first**
   - Measure before changing behavior.
   - Confirm whether `appRegistry.ts` is the main contributor.

2. **Introduce lazy app loading in the registry**
   - Highest payoff.
   - Keep manifest metadata synchronous.

3. **Keep the existing lazy `GlobalSearchOverlay` pattern**
   - Extend it only if similar overlays are large and infrequent.

4. **Split only clearly heavy shell-only overlays**
   - Do this after profiling confirms they matter.

## Suggested technical pattern

A safe pattern for the registry is:

- Keep a synchronous manifest for app metadata.
- Replace direct component imports with lazy factories.
- Render those components inside a stable suspense boundary in the window host.

This preserves the current app model while deferring actual component code until the app is used.

## Validation checklist before implementing

- Confirm the window container already supports loading states for lazy components.
- Confirm error boundaries exist for failed dynamic imports.
- Confirm the app registry consumers can handle a component factory instead of a direct component reference.
- Check for any modules with import-time side effects that should remain eager.
- Verify that shared dependencies do not get duplicated across chunks.

## Bottom line

The strongest bundle-size opportunity in the current structure is the **eager `appRegistry.ts` import graph**. The shell itself is relatively lean and already has at least one lazy boundary (`GlobalSearchOverlay`). The safest path is to keep the shell eager, then introduce lazy loading for infrequently used app components behind the registry, with profiling and suspense/error handling in place first.