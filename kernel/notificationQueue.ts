// ── Notification Queue Manager ────────────────────────────────────────────
// Manages notification display timing, deduplication, and priorities

export type NotifPriority = 'low' | 'normal' | 'high' | 'critical';

export interface QueuedNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: NotifPriority;
  timestamp: number;
  read: boolean;
  appId?: string;
  action?: () => void;
  ttl?: number; // ms before auto-dismiss
}

class NotificationQueue {
  private queue: QueuedNotification[] = [];
  private maxHistory = 100;
  private dedupeWindow = 2000; // ms

  enqueue(notif: Omit<QueuedNotification, 'id' | 'timestamp' | 'read'>): QueuedNotification {
    // Deduplicate: skip if same title+message within window
    const now = Date.now();
    const dupe = this.queue.find(n => 
      n.title === notif.title && n.message === notif.message && 
      (now - n.timestamp) < this.dedupeWindow
    );
    if (dupe) return dupe;

    const entry: QueuedNotification = {
      ...notif,
      id: uuid(),
      timestamp: now,
      read: false,
    };

    // Insert by priority
    const priorityOrder: NotifPriority[] = ['critical', 'high', 'normal', 'low'];
    const idx = this.queue.findIndex(n => 
      priorityOrder.indexOf(n.priority) > priorityOrder.indexOf(entry.priority)
    );
    if (idx >= 0) this.queue.splice(idx, 0, entry);
    else this.queue.push(entry);

    // Trim history
    if (this.queue.length > this.maxHistory) this.queue = this.queue.slice(-this.maxHistory);
    return entry;
  }

  markRead(id: string) {
    const n = this.queue.find(n => n.id === id);
    if (n) n.read = true;
  }

  markAllRead() {
    this.queue.forEach(n => n.read = true);
  }

  dismiss(id: string) {
    this.queue = this.queue.filter(n => n.id !== id);
  }

  getUnread(): QueuedNotification[] {
    return this.queue.filter(n => !n.read);
  }

  getAll(): QueuedNotification[] {
    return [...this.queue];
  }

  clear() {
    this.queue = [];
  }

  getUnreadCount(): number {
    return this.queue.filter(n => !n.read).length;
  }
}

export const notificationQueue = new NotificationQueue();
