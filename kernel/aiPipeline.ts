export type AIPipelineCapability =
  | 'read-state'
  | 'ask-question'
  | 'open-app'
  | 'close-app'
  | 'read-file'
  | 'write-file'
  | 'edit-file'
  | 'run-command'
  | 'browse'
  | 'search'
  | 'schedule-task';

export type AIPipelineTaskKind =
  | 'answer'
  | 'manage-apps'
  | 'code'
  | 'inspect'
  | 'multitask'
  | 'observe'
  | 'system';

export type AIPipelineTask = {
  id: string;
  kind: AIPipelineTaskKind;
  title: string;
  context: string[];
  capabilities: AIPipelineCapability[];
  status: 'queued' | 'running' | 'paused' | 'done' | 'failed';
  priority: number;
  payload?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

type PipelineListener = (tasks: AIPipelineTask[]) => void;

class AIPipeline {
  private tasks: AIPipelineTask[] = [];
  private listeners = new Set<PipelineListener>();
  private activeTaskId: string | null = null;

  enqueue(task: Omit<AIPipelineTask, 'status' | 'createdAt' | 'updatedAt'> & { status?: AIPipelineTask['status'] }) {
    const now = Date.now();
    const normalized: AIPipelineTask = {
      ...task,
      status: task.status ?? 'queued',
      createdAt: now,
      updatedAt: now
    };

    const existing = this.tasks.findIndex(item => item.id === normalized.id);
    if (existing >= 0) {
      this.tasks[existing] = normalized;
    } else {
      this.tasks.push(normalized);
    }

    this.tasks.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    this.emit();
    return normalized;
  }

  updateTask(id: string, patch: Partial<Pick<AIPipelineTask, 'status' | 'title' | 'priority' | 'context' | 'capabilities' | 'payload'>>) {
    const task = this.tasks.find(item => item.id === id);
    if (!task) return null;
    Object.assign(task, patch, { updatedAt: Date.now() });
    this.emit();
    return task;
  }

  getActiveTask() {
    return this.activeTaskId ? this.tasks.find(task => task.id === this.activeTaskId) ?? null : null;
  }

  setActiveTask(taskId: string | null) {
    this.activeTaskId = taskId;
    this.tasks = this.tasks.map(task => task.id === taskId ? { ...task, status: task.status === 'done' || task.status === 'failed' ? task.status : 'running', updatedAt: Date.now() } : task);
    this.emit();
  }

  completeTask(taskId: string) {
    this.tasks = this.tasks.map(task => task.id === taskId ? { ...task, status: 'done', updatedAt: Date.now() } : task);
    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }
    this.emit();
  }

  failTask(taskId: string) {
    this.tasks = this.tasks.map(task => task.id === taskId ? { ...task, status: 'failed', updatedAt: Date.now() } : task);
    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }
    this.emit();
  }

  pauseTask(taskId: string) {
    this.updateTask(taskId, { status: 'paused' });
    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }
  }

  removeTask(taskId: string) {
    this.tasks = this.tasks.filter(task => task.id !== taskId);
    if (this.activeTaskId === taskId) {
      this.activeTaskId = null;
    }
    this.emit();
  }

  clearFinishedTasks() {
    this.tasks = this.tasks.filter(task => task.status === 'queued' || task.status === 'running' || task.status === 'paused');
    if (this.activeTaskId && !this.tasks.some(task => task.id === this.activeTaskId)) {
      this.activeTaskId = null;
    }
    this.emit();
  }

  canAccess(taskId: string | null, capability: AIPipelineCapability) {
    if (!taskId) return false;
    const task = this.tasks.find(item => item.id === taskId);
    if (!task) return false;
    return task.capabilities.includes(capability);
  }

  snapshot() {
    return this.tasks.map(task => ({ ...task }));
  }

  subscribe(listener: PipelineListener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snap = this.snapshot();
    this.listeners.forEach(listener => listener(snap));
  }
}

export const aiPipeline = new AIPipeline();
