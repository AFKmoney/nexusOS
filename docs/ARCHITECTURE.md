# NexusOS Architecture

## Core Principles
NexusOS is an Electron + React (Vite/TypeScript) based AI-native operating system running within a host OS. It acts as a bridge between high-performance neural compute (via AI Services) and an encapsulated Virtual File System (VFS).

### The Triad Architecture
1. **The Kernel (Logic Layer)**:
   - Contains singletons like `vfs` (VirtualFileSystem), `processManager` (Process scheduling), `memory` (Local storage search and retrieval), and `toolForge` (Execution of AI-generated apps).
2. **The Store (State Layer)**:
   - Uses `zustand` to maintain a globally synchronized state (`osStore.ts`). 
   - Uses `persist` middleware to ensure OS states (window position, custom apps, wallpapers) survive reboots.
3. **The Shell (UI Layer)**:
   - `App.tsx` orchestrates the desktop environment.
   - Spatial and context-aware elements like `Taskbar`, `StartMenu`, `WindowFrame`, and `ContextMenu`.

## Virtual File System (VFS)
- The VFS (`kernel/fileSystem.ts`) completely simulates an OS directory tree (`/system`, `/home`, etc.) inside `localStorage` (or indexedDB depending on future upgrades).
- **Persistent Nodes**: All files are converted to `FileNode` interfaces.
- **System Integration**:
  - Wallpapers exist as `HTML` files in `/system/wallpapers/`.
  - AI-generated custom apps (Forged Apps) exist as `HTML` files in `/home/user/Apps/`.

## Application Forge
- AI generates single-file HTML applications.
- When forged, the app is saved to the VFS.
- `WindowFrame.tsx` implements a `VfsAppRunner` that securely isolates the execution of these `.html` files in a sandboxed `iframe`.

## IPC & Security (Hardware Overlord Mode)
- Electron IPC bridges UI actions to native host execution (`electron-main.cjs`).
- **CRITICAL**: The `native-exec` channel allows the DAEMON AI to execute shell commands directly on the host machine. To prevent catastrophic exploits, a mandatory User Confirmation Dialog (`dialog.showMessageBox`) intercepts all native command requests.
