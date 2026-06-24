# NexusOS — Audit & Roadmap

> **Status:** Version 2.0.6 — audit pass performed June 2026.
> This document tracks the current audit status and outstanding work.

## Current status

**Version:** 2.0.6
**Build:** green (`npm run typecheck`, `npm test`, `npm run build` all pass)
**Test suite:** 154/154 tests passing across 22 test files
**Kernel modules:** 53
**OS:: actions:** 50 (across 7 categories: filesystem, app management, browser, git, code execution, multi-agent/vision/voice, RAG, self-evolution/cluster, system)
**Electron IPC channels:** 25
**VFS:** IndexedDB-backed with `localStorage` fallback, permission-gated by `appId`, recursive directory creation via `createDirRecursive`
**App Forge:** Operational; saves custom apps as isolated HTML files in the VFS
**Wallpapers:** 26 system presets (seeded into `/system/wallpapers/` at boot) + AI-generated wallpapers saved to `/home/user/Wallpapers/`
**Security:** Electron `native-exec` IPC requires explicit user confirmation modal before any host command execution. `DOMPurify` protects terminal outputs and markdown rendering.

## Recently resolved

### 5-phase platform upgrade (June 2026)
- **Phase 1 — Agent that delivers:** Git integration (`kernel/git.ts` via isomorphic-git), web search (`kernel/webSearch.ts` via DuckDuckGo, no API key), code execution (`kernel/codeExecution.ts` — sandboxed JS/Python/TS in browser, real child_process in Electron), host filesystem bridge (7 `fs-*` IPC channels).
- **Phase 2 — Multi-agent + vision + voice:** Agent orchestrator (`kernel/agentOrchestrator.ts` — 5 roles: planner, coder, reviewer, tester, researcher), vision module (`kernel/vision.ts` — screenshot + VLM analysis), voice module (`kernel/voice.ts` — STT + TTS via Web Speech API).
- **Phase 3 — RAG pipeline:** `kernel/rag.ts` — document indexing with chunking, embedding generation (OpenAI or hash fallback), cosine similarity retrieval, IndexedDB-backed vector store.
- **Phase 4 — Cloud sync + marketplace:** `kernel/sync.ts` — self-hosted sync client with client-side encryption. `kernel/pluginMarket.ts` — decentralized plugin marketplace with multi-registry support.
- **Phase 5 — Kill features:** `kernel/selfEvolution.ts` — safe AI-driven code modification through the full governance pipeline. `kernel/cluster.ts` — device clustering with compute leader election.

### Visual readability pass (June 2026)
- Added missing `.custom-scrollbar` CSS class (57 components referenced it but it was never defined).
- Added `::selection` styling, `*:focus-visible` global ring for keyboard accessibility.
- Fixed 5 `text-zinc-700` contrast issues (invisible on dark backgrounds).
- Bumped tiny text (`text-[8px]`/`text-[9px]`) to `text-[10px]` minimum across StartMenu, Taskbar, App.tsx.
- Added `prefers-reduced-motion` media query.

### Browser AI control (June 2026)
- `kernel/browserBridge.ts` — AI can now control the browser via 8 `OS::BROWSE_*` actions.
- Real Chromium `WebContentsView` in Electron for true browser rendering.
- NetRunner and WebRunner register with the bridge and respond to AI commands.

### NexusPortable cleanup (June 2026)
- All references to the removed mobile edition purged from code, docs, scripts, and workflows.

### Build pipeline (June 2026)
- `vite.config.ts` migrated to Vite 8/rolldown (manualChunks converted to function form).
- `puppeteer` moved to `devDependencies`.
- Version strings synchronized to 2.0.6 everywhere.

### Mistral API key purge (June 2026)
- Leaked key purged from git history via `git filter-repo`. All SHAs after the leak commit rewritten. Force-pushed to all branches. Key rotation on console.mistral.ai still required.

## Outstanding work

### High priority
1. **Code-signing** for the Windows NSIS installer (OV/EV certificate + `electron-builder.yml` configuration).
2. **macOS and Linux installers** — `release.yml` workflow already targets Linux (`AppImage` + `snap`), but `electron-builder.yml` is Windows-only.
3. **Test coverage** — 154 tests across 22 files, but 31 of 53 kernel modules still lack dedicated test files. Priority: `git.ts`, `webSearch.ts`, `codeExecution.ts`, `agentOrchestrator.ts`, `rag.ts`.

### Medium priority
4. **Visual agent builder** — node-based canvas (like ComfyUI) for constructing agent workflows visually. This is the feature that would make NexusOS accessible to non-developers.
5. **Sync server reference implementation** — a deployable Node + SQLite server that implements the protocol expected by `kernel/sync.ts`.
6. **Plugin registry** — community-maintained default registry for `kernel/pluginMarket.ts`. Currently points to a placeholder URL.
7. **Cluster UDP discovery** — `cluster-scan` IPC handler is a placeholder. Real implementation would use `dgram` for UDP broadcast.
8. **RAG embedding upgrade** — `kernel/rag.ts` uses a hash-based fallback when no OpenAI key is configured. Could use Wllama for local embeddings.

### Low priority
9. **Self-evolution test runner** — `kernel/selfEvolution.ts` runs `npm test` via Electron in Electron mode. Browser mode only does syntax validation. Could integrate the Node test runner more deeply.
10. **Voice multi-language** — `kernel/voice.ts` is hardcoded to `en-US`. Should detect locale from the OS store.
11. **Plugin signing** — `kernel/pluginMarket.ts` doesn't verify plugin signatures. A signing scheme would prevent malicious plugins.
