import { useOS } from '../store/osStore';
import { eventBus, OS_EVENTS } from './eventBus';
import { processManager, type ProcessInfo } from './processManager';
import { permissions, type Permission } from './permissions';
import { sessions, type Session } from './sessions';
import { aiContextRouter } from './aiContextRouter';

export type OSContextWindowSnapshot = {
  id: string;
  appId: string;
  title: string;
  workspaceId?: number | null;
  isMinimized?: boolean;
  isFocused?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  createdAt?: number;
  updatedAt?: number;
  data?: Record<string, unknown>;
};

export type OSContextNotificationSnapshot = {
  id?: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  timestamp?: number;
};

export type OSContextFileSnapshot = {
  path: string;
  name: string;
  workspaceId?: number | null;
  lastModified?: number;
  kind?: 'file' | 'directory';
};

export type OSContextPermissionSnapshot = {
  appId: string;
  permissions: Permission[];
  registered: boolean;
};

export type OSContextEventSnapshot = {
  event: string;
  payload: unknown;
  timestamp: number;
};

export type OSContextSystemStatus = {
  timestamp: number;
  online: boolean;
  language: string;
  timezone?: string;
  uptimeMs: number;
  uptimeSeconds: number;
  processCount: number;
  totalMemoryEstimate: number;
  activeTaskCount: number;
  activeProcessCount: number;
  locked: boolean;
};

export type OSContextSnapshot = {
  currentUser: {
    id: string | null;
    name: string | null;
    isAdmin: boolean;
    themeColor?: string;
  };
  activeWorkspace: number | null;
  activeWindowId: string | null;
  windows: OSContextWindowSnapshot[];
  runningApps: string[];
  processes: ProcessInfo[];
  notifications: OSContextNotificationSnapshot[];
  recentActions: string[];
  recentFiles: OSContextFileSnapshot[];
  permissions: OSContextPermissionSnapshot[];
  sessions: {
    autoSave: Session | null;
    recent: Session[];
  };
  system: OSContextSystemStatus;
  eventHistory: OSContextEventSnapshot[];
  ai: {
    recentActions: string[];
    memoryContext: string[];
  };
};

function getWorkspaceAwareRecentFiles(state: ReturnType<typeof useOS.getState>): OSContextFileSnapshot[] {
  const stateRecord = state as unknown as Record<string, unknown>;
  const recentFiles = Array.isArray(stateRecord.recentFiles) ? stateRecord.recentFiles : [];
  return recentFiles.slice(-20).map((entry) => {
    if (typeof entry === 'string') {
      const name = entry.split('/').pop() ?? entry;
      return { path: entry, name, kind: 'file' as const };
    }

    if (entry && typeof entry === 'object') {
      const file = entry as Record<string, unknown>;
      const path = typeof file.path === 'string' ? file.path : typeof file.fullPath === 'string' ? file.fullPath : '';
      const name = typeof file.name === 'string' ? file.name : (path.split('/').pop() ?? 'unknown');
      const kind = file.kind === 'directory' ? 'directory' : 'file';
      const snapshot: OSContextFileSnapshot = {
        path,
        name,
        kind
      };
      if (typeof file.workspaceId === 'number') snapshot.workspaceId = file.workspaceId;
      if (typeof file.lastModified === 'number') snapshot.lastModified = file.lastModified;
      return snapshot;
    }

    return { path: '', name: 'unknown', kind: 'file' as const };
  }).filter((file) => file.path.length > 0 || file.name.length > 0);
}

function getNotificationsSnapshot(state: ReturnType<typeof useOS.getState>): OSContextNotificationSnapshot[] {
  const stateRecord = state as unknown as Record<string, unknown>;
  const notifications = Array.isArray(stateRecord.notifications) ? stateRecord.notifications : [];
  return notifications.slice(-20).map((notification) => {
    if (notification && typeof notification === 'object') {
      const item = notification as Record<string, unknown>;
      const snapshot: OSContextNotificationSnapshot = {
        title: typeof item.title === 'string' ? item.title : 'Notification',
        message: typeof item.message === 'string' ? item.message : ''
      };
      if (typeof item.id === 'string') snapshot.id = item.id;
      if (typeof item.type === 'string') snapshot.type = item.type;
      if (typeof item.read === 'boolean') snapshot.read = item.read;
      if (typeof item.timestamp === 'number') snapshot.timestamp = item.timestamp;
      return snapshot;
    }

    return {
      title: 'Notification',
      message: String(notification ?? ''),
    };
  });
}

function getWindowsSnapshot(state: ReturnType<typeof useOS.getState>): OSContextWindowSnapshot[] {
  const stateRecord = state as unknown as Record<string, unknown>;
  const windows = Array.isArray(stateRecord.windows) ? stateRecord.windows : [];
  return windows.map((win) => {
    const windowRecord = win as unknown as Record<string, unknown>;
    const snapshot: OSContextWindowSnapshot = {
      id: typeof windowRecord.id === 'string' ? windowRecord.id : '',
      appId: typeof windowRecord.appId === 'string' ? windowRecord.appId : '',
      title: typeof windowRecord.title === 'string'
        ? windowRecord.title
        : typeof windowRecord.appId === 'string'
          ? windowRecord.appId
          : ''
    };
    if (typeof windowRecord.workspaceId === 'number') snapshot.workspaceId = windowRecord.workspaceId;
    if (typeof windowRecord.isMinimized === 'boolean') snapshot.isMinimized = windowRecord.isMinimized;
    if (typeof windowRecord.isFocused === 'boolean') snapshot.isFocused = windowRecord.isFocused;
    if (typeof windowRecord.x === 'number') snapshot.x = windowRecord.x;
    if (typeof windowRecord.y === 'number') snapshot.y = windowRecord.y;
    if (typeof windowRecord.width === 'number') snapshot.width = windowRecord.width;
    if (typeof windowRecord.height === 'number') snapshot.height = windowRecord.height;
    if (typeof windowRecord.zIndex === 'number') snapshot.zIndex = windowRecord.zIndex;
    if (typeof windowRecord.createdAt === 'number') snapshot.createdAt = windowRecord.createdAt;
    if (typeof windowRecord.updatedAt === 'number') snapshot.updatedAt = windowRecord.updatedAt;
    if (windowRecord.data && typeof windowRecord.data === 'object') snapshot.data = { ...(windowRecord.data as Record<string, unknown>) };
    return snapshot;
  });
}

function getRecentActionsFromEvents(): string[] {
  return eventBus.getHistory(20).map((entry) => {
    const payload = typeof entry.payload === 'string' ? entry.payload : entry.payload ? JSON.stringify(entry.payload) : '';
    return payload ? `${entry.event}: ${payload}` : entry.event;
  });
}

function getPermissionSnapshot(state: ReturnType<typeof useOS.getState>): OSContextPermissionSnapshot[] {
  const stateRecord = state as unknown as Record<string, unknown>;
  const windows = Array.isArray(stateRecord.windows) ? stateRecord.windows : [];
  const installedApps = Array.isArray(stateRecord.installedApps) ? stateRecord.installedApps : [];
  const apps = new Set<string>();

  windows.forEach((win) => {
    const windowRecord = win as unknown as Record<string, unknown>;
    if (typeof windowRecord.appId === 'string') apps.add(windowRecord.appId);
  });

  installedApps.forEach((appId) => {
    if (typeof appId === 'string') apps.add(appId);
  });

  return Array.from(apps).slice(0, 50).map((appId) => ({
    appId,
    permissions: permissions.getPermissions(appId),
    registered: permissions.isRegistered(appId)
  }));
}

function getCurrentUserSnapshot(state: ReturnType<typeof useOS.getState>) {
  const user = state.currentUser as unknown as Record<string, unknown> | null;
  if (!user) {
    return { id: null, name: null, isAdmin: false };
  }

  const snapshot: {
    id: string | null;
    name: string | null;
    isAdmin: boolean;
    themeColor?: string;
  } = {
    id: typeof user.id === 'string' ? user.id : null,
    name: typeof user.name === 'string' ? user.name : null,
    isAdmin: typeof user.isAdmin === 'boolean' ? user.isAdmin : false
  };

  if (typeof user.themeColor === 'string') snapshot.themeColor = user.themeColor;
  return snapshot;
}

export function buildOSContextSnapshot(): OSContextSnapshot {
  const state = useOS.getState();
  const stateRecord = state as unknown as Record<string, unknown>;
  const processes = processManager.listAll();
  const activeTasks = eventBus.getHistory(25).filter((entry) => entry.event.startsWith('os:ai:')).length;
  const isNavigatorDefined = typeof navigator !== 'undefined';
  const isPerformanceDefined = typeof performance !== 'undefined';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const windows = Array.isArray(stateRecord.windows) ? stateRecord.windows : [];
  const runningApps = Array.from(new Set([
    ...windows.map((win) => {
      const windowRecord = win as unknown as Record<string, unknown>;
      return typeof windowRecord.appId === 'string' ? windowRecord.appId : '';
    }).filter((appId): appId is string => appId.length > 0),
    ...processes.map((process) => process.appId)
  ]));

  const snapshot: OSContextSnapshot = {
    currentUser: getCurrentUserSnapshot(state),
    activeWorkspace: typeof state.activeWorkspace === 'number' ? state.activeWorkspace : null,
    activeWindowId: typeof state.activeWindowId === 'string' ? state.activeWindowId : null,
    windows: getWindowsSnapshot(state),
    runningApps,
    processes,
    notifications: getNotificationsSnapshot(state),
    recentActions: [
      ...aiContextRouter.getRecentActions(),
      ...getRecentActionsFromEvents()
    ].slice(-30),
    recentFiles: getWorkspaceAwareRecentFiles(state),
    permissions: getPermissionSnapshot(state),
    sessions: {
      autoSave: sessions.getAutoSave(),
      recent: sessions.list().slice(0, 10)
    },
    system: {
      timestamp: Date.now(),
      online: isNavigatorDefined ? navigator.onLine : true,
      language: isNavigatorDefined ? navigator.language : 'en',
      timezone,
      uptimeMs: isPerformanceDefined ? Math.round(performance.now()) : 0,
      uptimeSeconds: isPerformanceDefined ? Math.floor(performance.now() / 1000) : 0,
      processCount: processManager.count(),
      totalMemoryEstimate: processManager.getTotalMemory(),
      activeTaskCount: activeTasks,
      activeProcessCount: processes.filter((process) => process.state === 'running').length,
      locked: Boolean((state as unknown as Record<string, unknown>).daemonLocked)
    },
    eventHistory: eventBus.getHistory(20).map((entry) => ({
      event: entry.event,
      payload: entry.payload,
      timestamp: entry.timestamp
    })),
    ai: {
      recentActions: aiContextRouter.getRecentActions(),
      memoryContext: []
    }
  };

  return snapshot;
}

export { OS_EVENTS };