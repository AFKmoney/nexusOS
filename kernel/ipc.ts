/**
 * IPC (Inter-Process Communication) — Allows apps to communicate with each other
 * Uses channels: apps register message handlers and other apps can send messages
 */

import { eventBus } from './eventBus';

export interface IPCMessage {
  from: string;      // sender appId/windowId
  to: string;        // target appId or '*' for broadcast
  channel: string;   // message channel name
  payload: any;
  timestamp: number;
  id: string;
}

export type IPCHandler = (message: IPCMessage) => any;

class IPCSystem {
  private handlers: Map<string, Map<string, IPCHandler>> = new Map(); // appId -> channel -> handler
  private pendingReplies: Map<string, (result: any) => void> = new Map();

  /** Register a handler for a specific channel on an app */
  register(appId: string, channel: string, handler: IPCHandler) {
    if (!this.handlers.has(appId)) this.handlers.set(appId, new Map());
    this.handlers.get(appId)!.set(channel, handler);
  }

  /** Unregister a handler */
  unregister(appId: string, channel?: string) {
    if (channel) {
      this.handlers.get(appId)?.delete(channel);
    } else {
      this.handlers.delete(appId);
    }
  }

  /** Send a message to a specific app */
  send(from: string, to: string, channel: string, payload?: any): any {
    const msg: IPCMessage = {
      from,
      to,
      channel,
      payload,
      timestamp: Date.now(),
      id: Math.random().toString(36).slice(2),
    };

    eventBus.emit('ipc:message', msg);

    if (to === '*') {
      // Broadcast to all registered handlers for this channel
      this.handlers.forEach((channels, appId) => {
        const handler = channels.get(channel);
        if (handler && appId !== from) {
          try { handler(msg); } catch (e) { console.error(`[IPC] Error broadcasting to ${appId}:`, e); }
        }
      });
      return undefined;
    }

    // Targeted message
    const targetHandlers = this.handlers.get(to);
    if (!targetHandlers) return undefined;
    const handler = targetHandlers.get(channel);
    if (!handler) return undefined;
    try { return handler(msg); } catch (e) { console.error(`[IPC] Error sending to ${to}:`, e); return undefined; }
  }

  /** Send and await a response (promise-based RPC) */
  async request(from: string, to: string, channel: string, payload?: any, timeoutMs = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const result = this.send(from, to, channel, payload);
      if (result !== undefined) {
        resolve(result);
      } else {
        const timer = setTimeout(() => reject(new Error(`IPC timeout: ${to}/${channel}`)), timeoutMs);
        // If handler registered later, this would need pub/sub — for now resolve immediately
        clearTimeout(timer);
        resolve(null);
      }
    });
  }

  /** List all registered IPC channels */
  listChannels(): { appId: string; channels: string[] }[] {
    const result: { appId: string; channels: string[] }[] = [];
    this.handlers.forEach((channels, appId) => {
      result.push({ appId, channels: Array.from(channels.keys()) });
    });
    return result;
  }
}

export const ipc = new IPCSystem();
