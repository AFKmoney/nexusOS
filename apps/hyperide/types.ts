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

export type SidePanelKind = 'files' | 'search' | 'git';
