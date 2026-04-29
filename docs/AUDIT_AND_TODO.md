# NexusOS: Audit & Future Roadmap

## Current Status
**Version:** 2.0.2
**Core Health:** Stable
**VFS Architecture:** Fully persistent (LocalStorage/IndexedDB).
**App Forge:** Operational. Saves custom apps as isolated HTML files.
**Wallpapers:** Procedural and static wallpapers are successfully decoupled and loaded from VFS.
**Security:** Electron IPC channels (`native-exec`) are hardened with mandatory user-confirmation dialogs. `DOMPurify` protects terminal outputs and markdown rendering.

## What's Left to Do (TODO)

### 1. File System Limitations (High Priority) [RESOLVED]
- **Issue**: The current VFS stores entire file contents inside a single `osStore` state object or LocalStorage string. This will eventually hit browser quota limits (typically 5MB-10MB).
- **Fix**: The `vfs.content` storage has been migrated to `IndexedDB` as an asynchronous massive storage layer, while preserving the synchronous memory-mapped execution layer. The 5MB-10MB quota is bypassed.

### 6. App Functional Bugs — Audit Pass 1 (v2.0.2) [RESOLVED]
- **WeatherApp**: Was using hardcoded mock data. Now calls real **Open-Meteo API** (geocoding + 5-day forecast, no API key required).
- **RSSReader**: Was using hardcoded fake articles. Now fetches live RSS feeds via **AllOrigins CORS proxy** with XML DOMParser.
- **PasswordManager**: Labelled 'AES-GCM Encrypted' but stored passwords in **plain text**. Now uses real **Web Crypto API** (PBKDF2 key derivation + AES-GCM-256 encrypt/decrypt per entry).
- **VideoPlayer**: Volume and mute state were not wired to the native `<video>` element. Fixed via `useEffect` sync.
- **WelcomeApp**: Contained duplicate feature card and incorrect version label. Both fixed.

### 2. Multi-User Authentication & Cloud Sync
- **Issue**: Profiles are currently local and unencrypted.
- **Fix**: Implement a backend (e.g., Supabase or Puter SDK) to sync VFS nodes and user profiles. Add AES encryption to the VFS.

### 3. App Component Refactoring
- **Issue**: `App.tsx` is over 600 lines long and handles desktop drag-and-drop, global shortcuts, contextual menus, and rendering.
- **Fix**: Split `App.tsx` into smaller orchestrator components: `ShortcutOrchestrator`, `DesktopGrid`, `DesktopBackground`.

### 4. Background Daemon (Missing Bridge) [RESOLVED]
- **Issue**: `electron-main.cjs` has `startBridgeServer()` commented out because `daemon-bridge-server.cjs` is missing.
- **Fix**: The `daemon-bridge-server.cjs` has been re-implemented with a robust `ws` WebSocket layer, allowing DAEMON AI to execute background commands and push updates seamlessly to the UI.

### 5. Dependency Cleanup
- **Issue**: The `node_modules` folder was manually copied over from a previous deployment.
- **Fix**: Perform a clean `npm ci` after cleaning up `package.json` to ensure exact version matching across environments.
