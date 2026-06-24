# NexusOS Developer Guide: How NOT To Break The System

NexusOS relies on highly interdependent spatial mechanics and a robust VFS. This guide documents the exact constraints you must respect when expanding the OS.

## 1. Context Menu Constraints (Adaptive Right-Click)
The context menu logic is centralized in `App.tsx` within the `handleGlobalContextMenu` function. 

**DO NOT add `onContextMenu={...}` manually on internal components unless they explicitly require isolation.**
Instead:
- The global handler searches the DOM tree up from the click target (`e.target.closest(...)`).
- **To add a new context target:**
  1. Add a specific class or `data-` attribute to the HTML element (e.g., `data-vfs-path="/path"`).
  2. In `App.tsx`, intercept it BEFORE the Desktop Background check.
  3. Example order of priority: Text Selection > Input Fields > Taskbar > Icons (VFS) > Window Frames > Desktop.

## 2. Window Frame Modifications
The `WindowFrame.tsx` handles drag, drop, minimize, and restore states via `react-rnd`.
- **Do not modify the Z-index management manually.** It is globally synchronized by `globalZIndex` in `osStore.ts`.
- **Data-Attributes**: The main container has `data-window-id`. DO NOT remove this. The Context Menu relies on it to identify which window is being right-clicked.
- **Custom Apps**: If an app lacks a built-in React component, `WindowFrame` falls back to `VfsAppRunner`, loading an HTML file from the VFS via `sourcePath`. Do not remove `VfsAppRunner`.

## 3. Modifying the VFS (Virtual File System)
The VFS (`kernel/fileSystem.ts`) is a singleton.
- **Paths are strict**: Always use absolute paths starting with `/` (e.g., `/home/user/Desktop`).
- **Never mutate state directly**: Always use `vfs.writeFile`, `vfs.createDir`, or `vfs.delete`.
- The VFS triggers the `eventBus` on changes. UI components listen to these events to re-render. If you mutate a `FileNode` object directly without using the vfs methods, the UI will desync.

## 4. Forging Apps (ToolForge)
When expanding the AI App generation:
1. Ensure the output is a *single self-contained HTML file*.
2. Write the file to `/home/user/Apps/`.
3. Register the metadata via `registerCustomApp` in `osStore.ts`.
4. Ensure the metadata `sourcePath` accurately points to the VFS location.

## 5. Security & IPC (`electron-main.cjs`)
- **No raw `exec()` without confirmation**: If you add new native host capabilities (e.g., file system bridging), you MUST sanitize inputs and use Electron dialogs to prompt the user. 
- **Content Security Policy (CSP)**: Vite sets up a basic CSP. Ensure that `VfsAppRunner` iframes restrict `sandbox` execution correctly to prevent XSS breakouts into the Electron main process.
