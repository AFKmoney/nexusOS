# NexusOS — Audit & Roadmap

> **Status:** Version 2.0.6 — audit pass performed June 2026.
> This document replaces the original v2.0.3 audit log, which had drifted
> out of sync with the actual repository state.

## Current status

**Version:** 2.0.6
**Build:** green (`npm run typecheck`, `npm test`, `npm run build` all pass)
**Test suite:** 90/90 tests passing across 14 test files
**VFS:** IndexedDB-backed with `localStorage` fallback, permission-gated by `appId`
**App Forge:** Operational; saves custom apps as isolated HTML files in the VFS
**Wallpapers:** Procedural and static, decoupled and loaded from the VFS
**Security:** Electron IPC channels hardened; `native-exec` requires explicit
user confirmation dialog before executing host commands (see
`electron-main.cjs:180+`); `DOMPurify` protects terminal outputs and
markdown rendering

## Recently resolved

### NexusPortable cleanup (2026)
The mobile PWA + Android APK edition (previously under `NexusPortable/`)
has been fully removed from this repository. The desktop (browser +
Electron) build is the only supported target. All references in code,
docs, scripts, and GitHub workflows have been deleted.

### Build pipeline (v2.0.6)
- `vite.config.ts` migrated from Vite 6.4 (rollup) to Vite 8 (rolldown):
  `manualChunks` converted from object form to function form (required
  by rolldown).
- `puppeteer` moved from `dependencies` to `devDependencies` (it was
  shipped to end users for no reason — only the e2e harness uses it).

### Version drift (v2.0.6)
- `index.tsx`, `apps/WelcomeApp.tsx`, `apps/SystemMonitor.tsx` now all
  display `v2.0.6` (were stuck at `v2.0.3` / `v2.0.0`).
- `BUILD_AND_RELEASE.md` example installer name aligned with
  `package.json` version.

### Logging hygiene (v2.0.6)
- All kernel, store, and service `console.log` / `console.error` calls
  now go through `kernel/log.ts` (`kernelLog`), a single point of truth
  that can be silenced in production via `kernelLog.setProduction(true)`.
- 11 production `console.log` calls in boot paths, VFS init, AI
  pipeline, and event bus have been migrated.

### Documentation accuracy (v2.0.6)
- `docs/ARCHITECTURE.md`, `docs/BUILD_AND_RELEASE.md`, `docs/TESTING.md`
  were stale stubs that contradicted their canonical root counterparts.
  They are now pointers to the root docs.
- `README.md` badges aligned: Vite 8, no Android APK badge, correct
  source-file count, PWA icon MIME type corrected in `manifest.json`.

## Outstanding work

### High priority
1. **Rotate the leaked Mistral API key** still present in git history
   (commit `eeb16f6` removed it from the working tree but did not
   rewrite history). See `SECURITY.md` for the procedure. The key must
   be considered compromised regardless of any future history rewrite.
2. **Add tests for the four untested governance modules:**
   `kernel/autonomy.ts` (750 lines, the most complex module),
   `kernel/policyEngine.ts` (228 lines, deny-by-default policy gate),
   `kernel/humanOverride.ts` (179 lines, the kill switch),
   `kernel/autonomyHealthMonitor.ts` (190 lines, auto safe-mode).
3. **Decompose the largest app components:**
   `apps/HyperIDE.tsx` (786 lines), `apps/GovernanceDashboard.tsx`
   (717 lines), `apps/ModelManager.tsx` (598 lines) into sub-components.

### Medium priority
4. Reduce the 116 `: any` / `as any` casts in the strict-TS codebase.
5. Code-sign the Windows NSIS installer (see `BUILD_AND_RELEASE.md`
   section 4.3 for the cert + electron-builder.yml procedure).
6. Add macOS and Linux installers to `electron-builder.yml` — the
   release.yml workflow already targets Linux (`AppImage` + `snap`) but
   `electron-builder.yml` itself is Windows-only.
7. Replace `compression: store` with `maximum` if installer size
   becomes a concern (~100 MB today).

### Low priority
8. Move `apps/Settings.tsx` and `apps/ModelManagerApp.tsx` re-export
   indirections directly into `appRegistry.ts` (currently 4 and 3 line
   files that just re-export).
9. The legacy `docs/index.html` and `docs/screenshots/` directory have
   been removed (they were unreferenced and outdated). If you want a
   static doc site, scaffold one with VitePress or Starlight rather
   than re-adding ad-hoc HTML.
10. Remove the `kernel/autonomy.ts` header comment that says
    "DAEMON AUTONOMY ENGINE" — already done in this pass, but watch
    for new version drift in module headers.
