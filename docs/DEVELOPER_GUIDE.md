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
  3. Example order of priority: Text Selection > Input Fields > Taskbar > Icons (VFS file) > Window Frames > Desktop. (Note: desktop **icon positions** live in the Zustand store, not the VFS — the VFS only stores the underlying files.)

## 2. Window Frame Modifications
The `WindowFrame.tsx` handles drag, drop, minimize, restore, **snapping**, and **drag-to-restore** via `react-rnd`. It reads `pinned` and `opacity` from the store (not local state).
- **Do not modify z-index manually.** Z-index is **layered** and managed by `kernel/windowManager/zIndexManager.ts`. Each window's effective z-index is `layerFor(window) + relativeZ` where the layer is one of `LAYERS.DESKTOP_UI` (10, normal), `LAYERS.ALWAYS_ON_TOP` (9000, pinned), below the OS overlay bands (`OVERLAY_UI` 9500, `MODAL` 9900, `CONTEXT_MENU` 9999). The `globalZIndex` counter seeds `relativeZ` and is compacted when it exceeds 5000; it is **not** persisted.
- **Window logic lives in `kernel/windowManager/`** (focus stack, z-index, snap geometry, layouts). The store actions in `store/osStoreSlices.ts` are thin delegates — call those, do not re-implement focus/z-index logic in components.
- **Custom Apps**: If an app lacks a built-in React component, `WindowFrame` falls back to `CustomAppRunner` (`apps/CustomAppRunner.tsx`), loading code from the VFS via `sourcePath`. Do not remove `CustomAppRunner`.

## 3. Modifying the VFS (Virtual File System)
The VFS (`kernel/fileSystem.ts`) is a singleton.
- **Paths are strict**: Always use absolute paths starting with `/` (e.g., `/home/user/Desktop`).
- **Never mutate state directly**: Always use `vfs.writeFile`, `vfs.createDir`, or `vfs.delete`.
- The VFS triggers the `eventBus` on changes. UI components listen to these events to re-render. If you mutate a `FileNode` object directly without using the vfs methods, the UI will desync.

## 4. Forging Apps (ToolForge)
When expanding the AI App generation:
1. Ensure the output is a *single self-contained HTML file*.
2. Write the file to `/home/user/Apps/`.
3. Register the metadata via `registerCustomApp` in `store/osStoreSlices.ts`.
4. Ensure the metadata `sourcePath` accurately points to the VFS location.

## 5. Security & IPC (`electron-main.cjs`)
- **No raw `exec()` without confirmation**: If you add new native host capabilities (e.g., file system bridging), you MUST sanitize inputs and use Electron dialogs to prompt the user. 
- **Content Security Policy (CSP)**: Vite sets up a basic CSP. Ensure that `VfsAppRunner` iframes restrict `sandbox` execution correctly to prevent XSS breakouts into the Electron main process.
