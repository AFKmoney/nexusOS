import { aiPipeline, type AIPipelineCapability, type AIPipelineTask } from './aiPipeline';
import { useOS } from '../store/osStore';
import { getDesktopPath } from '../appShellConstants';
import { aiContextRouter } from './aiContextRouter';

type AIAction =
  | { type: 'ANSWER'; prompt: string }
  | { type: 'OPEN_APP'; appId: string; data?: Record<string, unknown> }
  | { type: 'CLOSE_APP'; appId: string }
  | { type: 'CODE'; files: string[]; prompt: string }
  | { type: 'INSPECT'; target: string }
  | { type: 'MULTITASK'; tasks: AIAction[] };

type AIPipelineBridgeState = {
  activeTask: AIPipelineTask | null;
  tasks: AIPipelineTask[];
  can: (capability: AIPipelineCapability) => boolean;
  dispatch: (action: AIAction) => Promise<string>;
  refresh: () => void;
};

const REQUIRED_CAPABILITIES: Record<AIAction['type'], AIPipelineCapability[]> = {
  ANSWER: ['ask-question', 'read-state'],
  OPEN_APP: ['open-app', 'read-state'],
  CLOSE_APP: ['close-app', 'read-state'],
  CODE: ['read-file', 'write-file', 'edit-file', 'run-command', 'read-state'],
  INSPECT: ['browse', 'search', 'read-file', 'read-state'],
  MULTITASK: ['schedule-task', 'read-state', 'read-file', 'write-file', 'edit-file', 'run-command', 'open-app', 'close-app']
};

function makeTaskId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function summariseAction(action: AIAction) {
  switch (action.type) {
    case 'ANSWER':
      return `Réponse IA: ${action.prompt}`;
    case 'OPEN_APP':
      return `Ouvrir l'app ${action.appId}`;
    case 'CLOSE_APP':
      return `Fermer l'app ${action.appId}`;
    case 'CODE':
      return `Coder ${action.files.join(', ')}`;
    case 'INSPECT':
      return `Inspecter ${action.target}`;
    case 'MULTITASK':
      return `${action.tasks.length} tâches parallèles`;
    default:
      return 'Tâche IA';
  }
}

function describeAction(action: AIAction): string {
  switch (action.type) {
    case 'ANSWER':
      return action.prompt;
    case 'OPEN_APP':
    case 'CLOSE_APP':
      return action.appId;
    case 'CODE':
      return action.files.join(',');
    case 'INSPECT':
      return action.target;
    case 'MULTITASK':
      return `${action.tasks.length} subtasks`;
    default:
      return 'unknown';
  }
}

function createTaskFromAction(action: AIAction): AIPipelineTask {
  const capabilities = REQUIRED_CAPABILITIES[action.type];
  const os = useOS.getState();
  const context = aiContextRouter.buildContext('AI', undefined, 'AI Pipeline');

  if (os.currentUser?.id) {
    aiContextRouter.logAction(`USER:${os.currentUser.id}`);
  }
  aiContextRouter.logAction(`TASK:${action.type}:${describeAction(action)}`);

  return {
    id: makeTaskId(action.type.toLowerCase()),
    kind: action.type === 'ANSWER' ? 'answer' :
      action.type === 'OPEN_APP' || action.type === 'CLOSE_APP' ? 'manage-apps' :
      action.type === 'CODE' ? 'code' :
      action.type === 'INSPECT' ? 'inspect' : 'multitask',
    title: summariseAction(action),
    priority: action.type === 'MULTITASK' ? 9 : 5,
    status: 'queued',
    context: [
      `Desktop path: ${getDesktopPath(os.currentUser?.id ?? null)}`,
      `Windows open: ${os.windows.length}`,
      `Active workspace: ${os.activeWorkspace ?? 'none'}`,
      `Recent actions: ${context.recentActions.slice(-3).join(' | ') || 'none'}`,
      `Memory recall: ${context.memoryRecall.slice(0, 3).join(' | ') || 'none'}`,
      `System online: ${context.systemState.online}`,
      `Language: ${context.systemState.language}`
    ],
    capabilities,
    payload: action as Record<string, unknown>,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

async function executeAction(action: AIAction): Promise<string> {
  const store = useOS.getState();
  const { localBrain } = await import('../services/localBrain');

  switch (action.type) {
    case 'ANSWER': {
      try {
          const response = await localBrain.generate(action.prompt);
          store.addNotification({
            title: 'DAEMON Response',
            message: response.slice(0, 200) + (response.length > 200 ? '...' : ''),
            type: 'info'
          });
          return response;
      } catch (e: any) {
          return `[AI ERROR] ${e.message}`;
      }
    }
    case 'OPEN_APP': {
      store.openWindow(action.appId, action.data);
      return `App opened: ${action.appId}`;
    }
    case 'CLOSE_APP': {
      const windowToClose = store.windows.find(win => win.appId === action.appId);
      if (windowToClose) {
        store.closeWindow(windowToClose.id);
        return `App closed: ${action.appId}`;
      }
      return `No open instance found for ${action.appId}`;
    }
    case 'CODE': {
      store.openWindow('hyperide', {
        path: action.files[0] ?? getDesktopPath(store.currentUser?.id ?? null),
        prompt: action.prompt,
        files: action.files
      });
      return `Code session launched for ${action.files.join(', ')}`;
    }
    case 'INSPECT': {
      store.openWindow('web_runner', {
        path: action.target
      });
      return `Inspection launched: ${action.target}`;
    }
    case 'MULTITASK': {
      const results = await Promise.all(action.tasks.map(executeAction));
      return results.join(' | ');
    }
    default:
      return 'Unknown action';
    }
    }

export const aiPipelineBridge: AIPipelineBridgeState = {
  get activeTask() {
    return aiPipeline.getActiveTask();
  },
  get tasks() {
    return aiPipeline.snapshot();
  },
  can(capability) {
    const task = aiPipeline.getActiveTask();
    return aiPipeline.canAccess(task?.id ?? null, capability);
  },
  async dispatch(action) {
    const task = createTaskFromAction(action);
    aiPipeline.enqueue(task);
    aiPipeline.setActiveTask(task.id);
    const result = await executeAction(action);
    aiPipeline.completeTask(task.id);
    aiPipeline.setActiveTask(null);
    return result;
  },
  refresh() {
    aiPipeline.clearFinishedTasks();
  }
};
