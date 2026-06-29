// Shared types for HyperIDE sub-components.

export interface EditorTab {
  path: string;
  name: string;
  content: string;
  modified: boolean;
}

export interface AiMsg {
  role: 'user' | 'ai';
  content: string;
}

export interface SearchHit {
  path: string;
  line: number;
  text: string;
}

export interface CursorPos {
  line: number;
  col: number;
}

export interface ContextMenuState {
  x: number;
  y: number;
  path: string;
  isDir: boolean;
}

/**
 * A project is a folder that serves as the root for a multi-file
 * editing session. HyperIDE tracks the project root so it can:
 *   - Show a project overview (file count, total size, languages)
 *   - Scope file search to the project
 *   - Enable "new file at project root" / "run project" actions
 *   - Persist the project root across sessions
 */
export interface ProjectState {
  rootPath: string;           // e.g. /system/apps/gen_abc123
  name: string;               // derived from rootPath
  openFiles: string[];        // paths relative to rootPath
  activeFile?: string;        // path relative to rootPath
  lastOpenedAt: number;
}

export type SidePanelKind = 'files' | 'search' | 'git' | 'project';
