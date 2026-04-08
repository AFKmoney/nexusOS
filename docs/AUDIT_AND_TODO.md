# NexusOS: Audit & Future Roadmap

## Current Status
**Version:** 2.0.0
**Core Health:** Stable
**VFS Architecture:** Fully persistent (LocalStorage/IndexedDB).
**App Forge:** Operational. Saves custom apps as isolated HTML files.
**Wallpapers:** Procedural and static wallpapers are successfully decoupled and loaded from VFS.
**Security:** Electron IPC channels (`native-exec`) are hardened with mandatory user-confirmation dialogs. `DOMPurify` protects terminal outputs and markdown rendering.

## What's Left to Do (TODO)

### 1. File System Limitations (High Priority)
- **Issue**: The current VFS stores entire file contents inside a single `osStore` state object or LocalStorage string. This will eventually hit browser quota limits (typically 5MB-10MB).
- **Fix**: Migrate `vfs.content` storage to the `File System Access API` or `IndexedDB` directly, keeping only the directory tree structure in memory.

### 2. Multi-User Authentication & Cloud Sync
- **Issue**: Profiles are currently local and unencrypted.
- **Fix**: Implement a backend (e.g., Supabase or Puter SDK) to sync VFS nodes and user profiles. Add AES encryption to the VFS.

### 3. App Component Refactoring
- **Issue**: `App.tsx` is over 600 lines long and handles desktop drag-and-drop, global shortcuts, contextual menus, and rendering.
- **Fix**: Split `App.tsx` into smaller orchestrator components: `ShortcutOrchestrator`, `DesktopGrid`, `DesktopBackground`.

### 4. Background Daemon (Missing Bridge)
- **Issue**: `electron-main.cjs` has `startBridgeServer()` commented out because `daemon-bridge-server.cjs` is missing.
- **Fix**: Re-implement `daemon-bridge-server.cjs` to provide a robust websocket layer for the DAEMON AI to perform background tasks while the UI is closed.

### 5. Dependency Cleanup
- **Issue**: The `node_modules` folder was manually copied over from a previous deployment.
- **Fix**: Perform a clean `npm ci` after cleaning up `package.json` to ensure exact version matching across environments.
