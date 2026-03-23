/**
 * UNDO/REDO STACK — Global undo system for VFS operations
 */
import { uuid } from '../utils/uuid';

export interface UndoEntry {
  id: string;
  type: 'write' | 'delete' | 'rename' | 'create_dir';
  path: string;
  previousContent?: string | null;
  newContent?: string | null;
  previousPath?: string;
  timestamp: number;
  description: string;
}

class UndoRedoStack {
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];
  private maxEntries = 50;

  /** Push an action to the undo stack */
  push(entry: Omit<UndoEntry, 'id' | 'timestamp'>) {
    this.undoStack.push({
      ...entry,
      id: uuid(),
      timestamp: Date.now(),
    });
    if (this.undoStack.length > this.maxEntries) this.undoStack.shift();
    this.redoStack = []; // Clear redo on new action
  }

  /** Get the last undoable action (does NOT execute — caller must apply) */
  popUndo(): UndoEntry | null {
    const entry = this.undoStack.pop();
    if (entry) this.redoStack.push(entry);
    return entry || null;
  }

  /** Get the last redoable action (does NOT execute — caller must apply) */
  popRedo(): UndoEntry | null {
    const entry = this.redoStack.pop();
    if (entry) this.undoStack.push(entry);
    return entry || null;
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  peekUndo(): UndoEntry | null { return this.undoStack.at(-1) || null; }
  peekRedo(): UndoEntry | null { return this.redoStack.at(-1) || null; }

  getUndoHistory(limit = 10): UndoEntry[] { return this.undoStack.slice(-limit).reverse(); }
  getRedoHistory(limit = 10): UndoEntry[] { return this.redoStack.slice(-limit).reverse(); }

  clear() { this.undoStack = []; this.redoStack = []; }
}

export const undoRedo = new UndoRedoStack();
