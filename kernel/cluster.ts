// ═══════════════════════════════════════════════════════════════════
// CLUSTER KERNEL MODULE — Sovereign AI device clustering
//
// Enables multiple NexusOS instances (on different devices) to discover
// each other on the local network and share compute resources. The
// most powerful device becomes the "compute leader" and runs the LLM;
// other devices connect to it as thin clients.
//
// This is the "sovereign cloud" — your devices work together without
// any external server. Your laptop can use your desktop's GPU for
// inference, or your phone can use your laptop's CPU.
//
// Discovery: UDP broadcast on port 41720 (same as Chrome Cast).
// Protocol: WebSocket on port 41721 once paired.
// Security: Devices must be pre-paired (shared secret) to join.
// ═══════════════════════════════════════════════════════════════════

import { eventBus } from './eventBus';
import { kernelLog } from './log';

export interface ClusterDevice {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  port: number;
  capabilities: {
    cpu: number;        // CPU cores
    memory: number;     // MB
    gpu?: string;       // GPU model if available
    hasLocalModel: boolean;
  };
  isLeader: boolean;
  isPaired: boolean;
  lastSeen: number;
}

export interface ClusterStatus {
  deviceId: string;
  isLeader: boolean;
  leaderId: string | null;
  peers: ClusterDevice[];
  computeEndpoint: string | null;
}

const CLUSTER_KEY = 'nexusos_cluster';
const DISCOVERY_PORT = 41720;

class ClusterModule {
  private status: ClusterStatus = {
    deviceId: '',
    isLeader: true,
    leaderId: null,
    peers: [],
    computeEndpoint: null,
  };
  private isScanning = false;

  init(): void {
    try {
      const stored = localStorage.getItem(CLUSTER_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        this.status.deviceId = config.deviceId || this.generateDeviceId();
      } else {
        this.status.deviceId = this.generateDeviceId();
        this.save();
      }
    } catch {
      this.status.deviceId = this.generateDeviceId();
    }

    kernelLog.info(`[Cluster] Device ID: ${this.status.deviceId}`);
  }

  /**
   * Scan the local network for other NexusOS devices. In browser mode,
   * this uses WebRTC for discovery (limited). In Electron mode, it
   * uses UDP broadcast (full network scan).
   */
  async scan(timeoutMs = 5000): Promise<ClusterDevice[]> {
    if (this.isScanning) return this.status.peers;
    this.isScanning = true;

    try {
      // Electron mode — use native UDP discovery via IPC
      if (typeof window !== 'undefined' && (window as any).electron?.invoke) {
        const res = await (window as any).electron.invoke('cluster-scan', { timeoutMs });
        if (res.success) {
          this.status.peers = res.devices.map((d: any) => ({
            ...d,
            isPaired: false,
            lastSeen: Date.now(),
          }));
          eventBus.emit('cluster:peers-updated', this.status.peers);
        }
      }
      // Browser mode — no UDP available. Users must pair manually
      // by entering the peer's IP address.
    } catch (e: any) {
      kernelLog.warn('[Cluster] Scan failed:', e.message);
    }

    this.isScanning = false;
    return this.status.peers;
  }

  /**
   * Manually pair with a device by IP address. Used in browser mode
   * where UDP discovery isn't available.
   */
  async pairWithDevice(ip: string, port = 41721, sharedSecret: string): Promise<boolean> {
    try {
      const resp = await fetch(`http://${ip}:${port}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.status.deviceId,
          secret: sharedSecret,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!resp.ok) return false;

      const data = await resp.json();
      const device: ClusterDevice = {
        id: data.deviceId,
        name: data.name,
        hostname: data.hostname,
        ip,
        port,
        capabilities: data.capabilities,
        isLeader: data.isLeader,
        isPaired: true,
        lastSeen: Date.now(),
      };

      // If the peer is more powerful, become a follower
      if (this.shouldDeferTo(device)) {
        this.status.isLeader = false;
        this.status.leaderId = device.id;
        this.status.computeEndpoint = `ws://${ip}:${port}/compute`;
      }

      this.status.peers.push(device);
      eventBus.emit('cluster:peer-paired', device);
      this.save();
      return true;
    } catch (e: any) {
      kernelLog.warn('[Cluster] Pairing failed:', e.message);
      return false;
    }
  }

  /**
   * Decide whether this device should defer to the peer (become a
   * follower instead of leader). The device with more CPU + memory
   * wins. GPU presence is a tiebreaker.
   */
  private shouldDeferTo(peer: ClusterDevice): boolean {
    const myScore = this.getComputeScore();
    const peerScore = this.getDeviceScore(peer);
    return peerScore > myScore;
  }

  private getComputeScore(): number {
    if (typeof navigator !== 'undefined') {
      return (navigator.hardwareConcurrency || 4) * 100;
    }
    return 400;
  }

  private getDeviceScore(device: ClusterDevice): number {
    let score = device.capabilities.cpu * 100 + device.capabilities.memory / 10;
    if (device.capabilities.gpu) score += 500;
    if (device.capabilities.hasLocalModel) score += 300;
    return score;
  }

  /**
   * Get the current cluster status.
   */
  getStatus(): ClusterStatus {
    return { ...this.status };
  }

  /**
   * Leave the cluster.
   */
  leave(): void {
    this.status.isLeader = true;
    this.status.leaderId = null;
    this.status.computeEndpoint = null;
    this.status.peers = [];
    eventBus.emit('cluster:left', {});
    this.save();
  }

  private generateDeviceId(): string {
    return `nexus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private save(): void {
    localStorage.setItem(CLUSTER_KEY, JSON.stringify({
      deviceId: this.status.deviceId,
      isLeader: this.status.isLeader,
      leaderId: this.status.leaderId,
    }));
  }
}

export const cluster = new ClusterModule();
