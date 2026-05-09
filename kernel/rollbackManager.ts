import { uuid } from '../utils/uuid';
import { autonomyEventLog } from './autonomyEventLog';

// ═══════════════════════════════════════════════════════════════════
// ROLLBACK MANAGER v1.0 — State Snapshots and Recovery Primitives
// Every staged change has a recovery path. Rollback is idempotent.
// Phase 6 of the Autonomy Roadmap.
// ═══════════════════════════════════════════════════════════════════

export type SnapshotKind =
  | 'store-state'
  | 'vfs-file'
  | 'app-registry'
  | 'kernel-rules'
  | 'autonomy-policy';

export interface Snapshot {
  id: string;
  proposalId?: string;
  kind: SnapshotKind;
  key: string;
  data: unknown;
  createdAt: number;
  seq: number;
  description: string;
}

export interface RollbackRecord {
  id: string;
  proposalId?: string;
  snapshotIds: string[];
  status: 'pending' | 'succeeded' | 'failed';
  triggeredAt: number;
  completedAt?: number;
  failureReason?: string;
}

class RollbackManager {
  private snapshots: Map<string, Snapshot> = new Map();
  private rollbackRecords: Map<string, RollbackRecord> = new Map();
  private readonly MAX_SNAPSHOTS = 100;
  private seq = 0;

  snapshot(
    kind: SnapshotKind,
    key: string,
    data: unknown,
    options: { proposalId?: string; description?: string } = {}
  ): Snapshot {
    if (this.snapshots.size >= this.MAX_SNAPSHOTS) {
      const oldestId = [...this.snapshots.values()]
        .sort((a, b) => a.seq - b.seq)[0]?.id;
      if (oldestId) this.snapshots.delete(oldestId);
    }

    const snap: Snapshot = {
      id: uuid(),
      proposalId: options.proposalId,
      kind,
      key,
      data: this.deepClone(data),
      createdAt: Date.now(),
      seq: ++this.seq,
      description: options.description ?? `${kind}:${key}`,
    };

    this.snapshots.set(snap.id, snap);
    return snap;
  }

  getSnapshot(snapshotId: string): Snapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  getSnapshotsForProposal(proposalId: string): Snapshot[] {
    return [...this.snapshots.values()].filter(s => s.proposalId === proposalId);
  }

  getLatestSnapshot(kind: SnapshotKind, key: string): Snapshot | undefined {
    return [...this.snapshots.values()]
      .filter(s => s.kind === kind && s.key === key)
      .sort((a, b) => (b.createdAt - a.createdAt) || (b.seq - a.seq))[0];
  }

  async rollback(
    snapshotIds: string[],
    restoreFn: (snapshot: Snapshot) => Promise<void>,
    options: { proposalId?: string } = {}
  ): Promise<RollbackRecord> {
    const record: RollbackRecord = {
      id: uuid(),
      proposalId: options.proposalId,
      snapshotIds,
      status: 'pending',
      triggeredAt: Date.now(),
    };
    this.rollbackRecords.set(record.id, record);

    autonomyEventLog.append({
      kind: 'rollback-triggered',
      subsystem: 'rollback-manager',
      actor: 'system',
      summary: `Rollback triggered for ${snapshotIds.length} snapshot(s)`,
      proposalId: options.proposalId,
      metadata: { snapshotIds, rollbackRecordId: record.id },
    });

    for (const snapshotId of snapshotIds) {
      const snapshot = this.snapshots.get(snapshotId);
      if (!snapshot) {
        record.status = 'failed';
        record.failureReason = `Snapshot not found: ${snapshotId}`;
        record.completedAt = Date.now();
        this.rollbackRecords.set(record.id, record);

        autonomyEventLog.append({
          kind: 'rollback-failed',
          subsystem: 'rollback-manager',
          actor: 'system',
          summary: `Rollback failed: snapshot ${snapshotId} not found`,
          proposalId: options.proposalId,
          outcome: 'failure',
          errorMessage: record.failureReason,
        });

        return record;
      }

      try {
        await restoreFn(snapshot);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        record.status = 'failed';
        record.failureReason = `Restore failed for snapshot ${snapshotId}: ${msg}`;
        record.completedAt = Date.now();
        this.rollbackRecords.set(record.id, record);

        autonomyEventLog.append({
          kind: 'rollback-failed',
          subsystem: 'rollback-manager',
          actor: 'system',
          summary: `Rollback restore threw: ${msg}`,
          proposalId: options.proposalId,
          outcome: 'failure',
          errorMessage: record.failureReason,
        });

        return record;
      }
    }

    record.status = 'succeeded';
    record.completedAt = Date.now();
    this.rollbackRecords.set(record.id, record);

    autonomyEventLog.append({
      kind: 'rollback-succeeded',
      subsystem: 'rollback-manager',
      actor: 'system',
      summary: `Rollback succeeded for ${snapshotIds.length} snapshot(s)`,
      proposalId: options.proposalId,
      outcome: 'success',
    });

    return record;
  }

  getAllSnapshots(): Snapshot[] {
    return [...this.snapshots.values()];
  }

  getRollbackRecord(recordId: string): RollbackRecord | undefined {
    return this.rollbackRecords.get(recordId);
  }

  getAllRollbackRecords(): RollbackRecord[] {
    return [...this.rollbackRecords.values()];
  }

  private deepClone<T>(data: T): T {
    try {
      return JSON.parse(JSON.stringify(data)) as T;
    } catch {
      return data;
    }
  }
}

export const rollbackManager = new RollbackManager();
