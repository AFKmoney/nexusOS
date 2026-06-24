import { uuid } from '../utils/uuid';
import { ActionClass, ActionScope, policyEngine } from './policyEngine';
import { autonomyEventLog } from './autonomyEventLog';

// ═══════════════════════════════════════════════════════════════════
// PROPOSAL ENGINE v1.0 — AI Change Proposal + State Machine
// AI must propose before it acts. No direct mutation path.
// Phase 3 of the Autonomy Roadmap.
// ═══════════════════════════════════════════════════════════════════

export type ProposalStatus =
  | 'draft'
  | 'validating'
  | 'validation-failed'
  | 'pending-approval'
  | 'approved'
  | 'denied'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'rolled-back';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ProposalValidationStep {
  name: string;
  description: string;
  required: boolean;
}

export interface Proposal {
  id: string;
  runId: string;
  title: string;
  description: string;
  actionClass: ActionClass;
  scope: ActionScope;
  riskLevel: RiskLevel;
  targetPath?: string;
  affectedSubsystems: string[];
  validationSteps: ProposalValidationStep[];
  rollbackPlan: string;
  approvalRequired: boolean;
  approvalFrom?: 'user' | 'admin';
  status: ProposalStatus;
  validationResults: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
  executedAt?: number;
  completedAt?: number;
  rejectionReason?: string;
  errorMessage?: string;
  payload?: Record<string, unknown>;
}

type ProposalListener = (proposals: Proposal[]) => void;

class ProposalEngine {
  private proposals: Map<string, Proposal> = new Map();
  private listeners = new Set<ProposalListener>();
  private readonly MAX_PROPOSALS = 200;

  create(
    input: Pick<
      Proposal,
      | 'title'
      | 'description'
      | 'actionClass'
      | 'scope'
      | 'riskLevel'
      | 'targetPath'
      | 'affectedSubsystems'
      | 'validationSteps'
      | 'rollbackPlan'
      | 'payload'
    >
  ): Proposal {
    const policyResult = policyEngine.evaluate({
      actionClass: input.actionClass,
      scope: input.scope,
      initiator: 'ai',
      ...(input.targetPath !== undefined ? { targetPath: input.targetPath } : {}),
    });

    const approvalRequired =
      policyResult.decision === 'require-approval' ||
      policyResult.decision === 'require-staged';

    const now = Date.now();
    const proposal: Proposal = {
      ...input,
      id: uuid(),
      runId: autonomyEventLog.getCurrentRunId(),
      approvalRequired,
      ...(policyResult.requiresApprovalFrom !== undefined ? { approvalFrom: policyResult.requiresApprovalFrom } : {}),
      status: 'draft',
      validationResults: {},
      createdAt: now,
      updatedAt: now,
    };

    if (policyResult.decision === 'deny') {
      proposal.status = 'denied';
      proposal.rejectionReason = policyResult.reason;
      proposal.updatedAt = Date.now();
    }

    this.store(proposal);

    autonomyEventLog.append({
      kind: policyResult.decision === 'deny' ? 'proposal-denied' : 'proposal-created',
      subsystem: 'proposal-engine',
      actor: 'ai',
      summary: `Proposal "${input.title}" created (status: ${proposal.status})`,
      proposalId: proposal.id,
      policyDecisionId: policyResult.id,
      outcome: policyResult.decision === 'deny' ? 'failure' : 'success',
      ...(policyResult.decision === 'deny' ? { errorMessage: policyResult.reason } : {}),
      metadata: { actionClass: input.actionClass, scope: input.scope, riskLevel: input.riskLevel },
    });

    return proposal;
  }

  markValidating(proposalId: string): Proposal | null {
    return this.transition(proposalId, 'validating');
  }

  recordValidationResult(proposalId: string, stepName: string, passed: boolean): Proposal | null {
    const proposal = this.get(proposalId);
    if (!proposal) return null;
    proposal.validationResults[stepName] = passed;
    proposal.updatedAt = Date.now();
    this.store(proposal);
    this.emit();
    return proposal;
  }

  markValidationFailed(proposalId: string, reason: string): Proposal | null {
    const proposal = this.transition(proposalId, 'validation-failed');
    if (proposal) {
      proposal.rejectionReason = reason;
      proposal.updatedAt = Date.now();
      this.store(proposal);
      autonomyEventLog.append({
        kind: 'proposal-rejected',
        subsystem: 'proposal-engine',
        actor: 'system',
        summary: `Proposal "${proposal.title}" failed validation: ${reason}`,
        proposalId,
        outcome: 'failure',
        errorMessage: reason,
      });
    }
    return proposal;
  }

  markPendingApproval(proposalId: string): Proposal | null {
    return this.transition(proposalId, 'pending-approval');
  }

  approve(proposalId: string): Proposal | null {
    const proposal = this.transition(proposalId, 'approved');
    if (proposal) {
      proposal.approvedAt = Date.now();
      proposal.updatedAt = Date.now();
      this.store(proposal);
      autonomyEventLog.append({
        kind: 'proposal-approved',
        subsystem: 'proposal-engine',
        actor: 'user',
        summary: `Proposal "${proposal.title}" approved`,
        proposalId,
        outcome: 'success',
      });
    }
    return proposal;
  }

  deny(proposalId: string, reason: string): Proposal | null {
    const proposal = this.transition(proposalId, 'denied');
    if (proposal) {
      proposal.rejectionReason = reason;
      proposal.updatedAt = Date.now();
      this.store(proposal);
      autonomyEventLog.append({
        kind: 'proposal-denied',
        subsystem: 'proposal-engine',
        actor: 'user',
        summary: `Proposal "${proposal.title}" denied: ${reason}`,
        proposalId,
        outcome: 'failure',
        errorMessage: reason,
      });
    }
    return proposal;
  }

  markExecuting(proposalId: string): Proposal | null {
    const proposal = this.transition(proposalId, 'executing');
    if (proposal) {
      proposal.executedAt = Date.now();
      proposal.updatedAt = Date.now();
      this.store(proposal);
      autonomyEventLog.append({
        kind: 'execution-started',
        subsystem: 'proposal-engine',
        actor: 'ai',
        summary: `Executing proposal "${proposal.title}"`,
        proposalId,
      });
    }
    return proposal;
  }

  markSucceeded(proposalId: string): Proposal | null {
    const proposal = this.transition(proposalId, 'succeeded');
    if (proposal) {
      proposal.completedAt = Date.now();
      proposal.updatedAt = Date.now();
      this.store(proposal);
      autonomyEventLog.append({
        kind: 'execution-succeeded',
        subsystem: 'proposal-engine',
        actor: 'system',
        summary: `Proposal "${proposal.title}" executed successfully`,
        proposalId,
        outcome: 'success',
      });
    }
    return proposal;
  }

  markFailed(proposalId: string, errorMessage: string): Proposal | null {
    const proposal = this.transition(proposalId, 'failed');
    if (proposal) {
      proposal.errorMessage = errorMessage;
      proposal.completedAt = Date.now();
      proposal.updatedAt = Date.now();
      this.store(proposal);
      autonomyEventLog.append({
        kind: 'execution-failed',
        subsystem: 'proposal-engine',
        actor: 'system',
        summary: `Proposal "${proposal.title}" failed: ${errorMessage}`,
        proposalId,
        outcome: 'failure',
        errorMessage,
      });
    }
    return proposal;
  }

  markRolledBack(proposalId: string): Proposal | null {
    return this.transition(proposalId, 'rolled-back');
  }

  get(proposalId: string): Proposal | undefined {
    return this.proposals.get(proposalId);
  }

  getAll(): Proposal[] {
    return [...this.proposals.values()];
  }

  getByStatus(status: ProposalStatus): Proposal[] {
    return this.getAll().filter(p => p.status === status);
  }

  getPendingApprovals(): Proposal[] {
    return this.getByStatus('pending-approval');
  }

  subscribe(listener: ProposalListener): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => this.listeners.delete(listener);
  }

  private store(proposal: Proposal): void {
    if (this.proposals.size >= this.MAX_PROPOSALS) {
      const oldest = [...this.proposals.entries()]
        .filter(([, p]) => p.status === 'succeeded' || p.status === 'rolled-back' || p.status === 'denied')
        .sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0];
      if (oldest) this.proposals.delete(oldest[0]);
    }
    this.proposals.set(proposal.id, { ...proposal });
    this.emit();
  }

  private transition(proposalId: string, newStatus: ProposalStatus): Proposal | null {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return null;
    proposal.status = newStatus;
    proposal.updatedAt = Date.now();
    this.store(proposal);
    return proposal;
  }

  private emit(): void {
    const all = this.getAll();
    this.listeners.forEach(l => l(all));
  }
}

export const proposalEngine = new ProposalEngine();
