import { uuid } from '../utils/uuid';
import { autonomyEventLog } from './autonomyEventLog';

// ═══════════════════════════════════════════════════════════════════
// STAGING MANAGER v1.0 — Phase 5: Isolated Staging + Secure Deploy
//
// Artifacts flow: draft → staged → sealed → promoted | reverted
// No proposal may mutate live state without passing through staging.
// ═══════════════════════════════════════════════════════════════════

export type StagingStatus =
  | 'draft'
  | 'staged'
  | 'sealed'
  | 'promoted'
  | 'reverted';

export type ArtifactKind =
  | 'store-patch'
  | 'vfs-file'
  | 'app-registry-entry'
  | 'kernel-rule'
  | 'autonomy-policy'
  | 'config-patch'
  | 'ui-component'
  | 'generic';

export interface StagedArtifact {
  id: string;
  proposalId: string;
  kind: ArtifactKind;
  key: string;
  content: unknown;
  previousContent: unknown;
  status: StagingStatus;
  version: number;
  createdAt: number;
  sealedAt?: number;
  promotedAt?: number;
  revertedAt?: number;
  promotedBy?: 'user' | 'system';
  metadata?: Record<string, unknown>;
}

export interface StagingDeployRecord {
  id: string;
  proposalId: string;
  artifactIds: string[];
  status: 'pending' | 'partial' | 'complete' | 'failed' | 'reverted';
  startedAt: number;
  completedAt?: number;
  failureReason?: string;
  actor: 'user' | 'system';
}

type StagingListener = (artifacts: StagedArtifact[]) => void;

class StagingManager {
  private artifacts: Map<string, StagedArtifact> = new Map();
  private deployRecords: Map<string, StagingDeployRecord> = new Map();
  private listeners = new Set<StagingListener>();
  private readonly MAX_ARTIFACTS = 300;

  // ── Write a new artifact into the staging area ─────────────────────────────
  stage(
    proposalId: string,
    kind: ArtifactKind,
    key: string,
    content: unknown,
    previousContent: unknown,
    metadata?: Record<string, unknown>
  ): StagedArtifact {
    const existing = this.findByProposalAndKey(proposalId, key);
    const version = existing ? existing.version + 1 : 1;

    const artifact: StagedArtifact = {
      id: uuid(),
      proposalId,
      kind,
      key,
      content: this.clone(content),
      previousContent: this.clone(previousContent),
      status: 'staged',
      version,
      createdAt: Date.now(),
      ...(metadata !== undefined ? { metadata } : {}),
    };

    this.evictIfFull();
    this.artifacts.set(artifact.id, artifact);
    this.emit();

    autonomyEventLog.append({
      kind: 'staging-artifact-added',
      subsystem: 'staging-manager',
      actor: 'system',
      summary: `Artifact staged: ${kind}:${key} (v${version}) for proposal ${proposalId}`,
      proposalId,
      metadata: { artifactId: artifact.id, kind, key, version },
    });

    return artifact;
  }

  // ── Seal a staged artifact (make it immutable, ready for promotion) ─────────
  seal(artifactId: string): StagedArtifact | null {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact || artifact.status !== 'staged') return null;

    artifact.status = 'sealed';
    artifact.sealedAt = Date.now();
    this.artifacts.set(artifactId, artifact);
    this.emit();

    autonomyEventLog.append({
      kind: 'staging-artifact-sealed',
      subsystem: 'staging-manager',
      actor: 'system',
      summary: `Artifact sealed: ${artifact.kind}:${artifact.key}`,
      proposalId: artifact.proposalId,
      metadata: { artifactId },
    });

    return artifact;
  }

  // ── Seal all artifacts for a proposal at once ───────────────────────────────
  sealAll(proposalId: string): StagedArtifact[] {
    const sealed: StagedArtifact[] = [];
    for (const artifact of this.artifacts.values()) {
      if (artifact.proposalId === proposalId && artifact.status === 'staged') {
        const result = this.seal(artifact.id);
        if (result) sealed.push(result);
      }
    }
    return sealed;
  }

  // ── Promote sealed artifacts into live state ────────────────────────────────
  async promote(
    proposalId: string,
    applyFn: (artifact: StagedArtifact) => Promise<void>,
    actor: 'user' | 'system' = 'system'
  ): Promise<StagingDeployRecord> {
    const sealed = this.getByProposal(proposalId).filter(a => a.status === 'sealed');

    const record: StagingDeployRecord = {
      id: uuid(),
      proposalId,
      artifactIds: sealed.map(a => a.id),
      status: 'pending',
      startedAt: Date.now(),
      actor,
    };
    this.deployRecords.set(record.id, record);

    autonomyEventLog.append({
      kind: 'staging-deploy-started',
      subsystem: 'staging-manager',
      actor,
      summary: `Promoting ${sealed.length} sealed artifact(s) for proposal ${proposalId}`,
      proposalId,
      metadata: { deployRecordId: record.id, artifactCount: sealed.length },
    });

    const promoted: string[] = [];

    for (const artifact of sealed) {
      try {
        await applyFn(artifact);
        artifact.status = 'promoted';
        artifact.promotedAt = Date.now();
        artifact.promotedBy = actor;
        this.artifacts.set(artifact.id, artifact);
        promoted.push(artifact.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        record.status = promoted.length > 0 ? 'partial' : 'failed';
        record.failureReason = `Failed to promote artifact ${artifact.id} (${artifact.kind}:${artifact.key}): ${msg}`;
        record.completedAt = Date.now();
        this.deployRecords.set(record.id, record);

        autonomyEventLog.append({
          kind: 'staging-deploy-failed',
          subsystem: 'staging-manager',
          actor: 'system',
          summary: `Promotion failed at artifact ${artifact.kind}:${artifact.key}: ${msg}`,
          proposalId,
          outcome: 'failure',
          errorMessage: msg,
          metadata: { deployRecordId: record.id, failedArtifactId: artifact.id },
        });

        this.emit();
        return record;
      }
    }

    record.status = 'complete';
    record.completedAt = Date.now();
    this.deployRecords.set(record.id, record);
    this.emit();

    autonomyEventLog.append({
      kind: 'staging-deploy-complete',
      subsystem: 'staging-manager',
      actor,
      summary: `Promotion complete: ${promoted.length} artifact(s) live for proposal ${proposalId}`,
      proposalId,
      outcome: 'success',
      metadata: { deployRecordId: record.id, promoted },
    });

    return record;
  }

  // ── Revert all staged artifacts for a proposal back to previous content ─────
  async revert(
    proposalId: string,
    restoreFn: (artifact: StagedArtifact) => Promise<void>
  ): Promise<void> {
    const candidates = this.getByProposal(proposalId).filter(
      a => a.status === 'sealed' || a.status === 'staged' || a.status === 'promoted'
    );

    autonomyEventLog.append({
      kind: 'staging-revert-started',
      subsystem: 'staging-manager',
      actor: 'system',
      summary: `Reverting ${candidates.length} artifact(s) for proposal ${proposalId}`,
      proposalId,
    });

    for (const artifact of candidates) {
      try {
        await restoreFn(artifact);
        artifact.status = 'reverted';
        artifact.revertedAt = Date.now();
        this.artifacts.set(artifact.id, artifact);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        autonomyEventLog.append({
          kind: 'staging-revert-failed',
          subsystem: 'staging-manager',
          actor: 'system',
          summary: `Revert failed for ${artifact.kind}:${artifact.key}: ${msg}`,
          proposalId,
          outcome: 'failure',
          errorMessage: msg,
        });
      }
    }

    autonomyEventLog.append({
      kind: 'staging-revert-complete',
      subsystem: 'staging-manager',
      actor: 'system',
      summary: `Revert complete for proposal ${proposalId}`,
      proposalId,
      outcome: 'success',
    });

    this.emit();
  }

  // ── Queries ─────────────────────────────────────────────────────────────────
  get(artifactId: string): StagedArtifact | undefined {
    return this.artifacts.get(artifactId);
  }

  getAll(): StagedArtifact[] {
    return [...this.artifacts.values()];
  }

  getByProposal(proposalId: string): StagedArtifact[] {
    return [...this.artifacts.values()].filter(a => a.proposalId === proposalId);
  }

  getByStatus(status: StagingStatus): StagedArtifact[] {
    return [...this.artifacts.values()].filter(a => a.status === status);
  }

  getActiveCount(): number {
    return [...this.artifacts.values()].filter(
      a => a.status === 'staged' || a.status === 'sealed'
    ).length;
  }

  getDeployRecord(id: string): StagingDeployRecord | undefined {
    return this.deployRecords.get(id);
  }

  getAllDeployRecords(): StagingDeployRecord[] {
    return [...this.deployRecords.values()];
  }

  subscribe(listener: StagingListener): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => this.listeners.delete(listener);
  }

  // ── Internals ───────────────────────────────────────────────────────────────
  private findByProposalAndKey(proposalId: string, key: string): StagedArtifact | undefined {
    return [...this.artifacts.values()]
      .filter(a => a.proposalId === proposalId && a.key === key)
      .sort((a, b) => b.version - a.version)[0];
  }

  private evictIfFull(): void {
    if (this.artifacts.size < this.MAX_ARTIFACTS) return;
    const evictable = [...this.artifacts.values()]
      .filter(a => a.status === 'promoted' || a.status === 'reverted')
      .sort((a, b) => a.createdAt - b.createdAt);
    if (evictable[0]) this.artifacts.delete(evictable[0].id);
  }

  private clone<T>(data: T): T {
    try {
      return JSON.parse(JSON.stringify(data)) as T;
    } catch {
      return data;
    }
  }

  private emit(): void {
    const all = this.getAll();
    this.listeners.forEach(l => l(all));
  }
}

export const stagingManager = new StagingManager();
