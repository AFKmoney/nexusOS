import { uuid } from '../utils/uuid';

// ═══════════════════════════════════════════════════════════════════
// AUTONOMY EVENT LOG v1.0 — Structured, Append-Only Audit Trail
// Correlates proposals → approvals → executions → outcomes.
// Phase 1 of the Autonomy Roadmap.
// ═══════════════════════════════════════════════════════════════════

export type AutonomyEventKind =
  | 'proposal-created'
  | 'proposal-validated'
  | 'proposal-rejected'
  | 'proposal-approved'
  | 'proposal-denied'
  | 'execution-started'
  | 'execution-succeeded'
  | 'execution-failed'
  | 'rollback-triggered'
  | 'rollback-succeeded'
  | 'rollback-failed'
  | 'override-activated'
  | 'override-deactivated'
  | 'policy-decision'
  | 'health-degraded'
  | 'health-recovered'
  | 'safe-mode-entered'
  | 'safe-mode-exited'
  // Phase 5 — staging events
  | 'staging-artifact-added'
  | 'staging-artifact-sealed'
  | 'staging-deploy-started'
  | 'staging-deploy-complete'
  | 'staging-deploy-failed'
  | 'staging-revert-started'
  | 'staging-revert-complete'
  | 'staging-revert-failed'
  // Phase 8 — trust tier events
  | 'trust-tier-override';

export type AutonomySubsystem =
  | 'policy-engine'
  | 'proposal-engine'
  | 'validation-pipeline'
  | 'rollback-manager'
  | 'human-override'
  | 'health-monitor'
  | 'autonomy-loop'
  | 'commander'
  | 'ai-pipeline'
  | 'staging-manager'
  | 'trust-tier-engine';

export interface AutonomyEvent {
  id: string;
  runId: string;
  kind: AutonomyEventKind;
  subsystem: AutonomySubsystem;
  timestamp: number;
  actor: 'ai' | 'user' | 'system';
  summary: string;
  proposalId?: string;
  taskId?: string;
  policyDecisionId?: string;
  outcome?: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

type EventLogListener = (events: AutonomyEvent[]) => void;

class AutonomyEventLog {
  private events: AutonomyEvent[] = [];
  private currentRunId: string = uuid();
  private listeners = new Set<EventLogListener>();
  private readonly MAX_EVENTS = 1000;

  startRun(): string {
    this.currentRunId = uuid();
    return this.currentRunId;
  }

  getCurrentRunId(): string {
    return this.currentRunId;
  }

  append(entry: Omit<AutonomyEvent, 'id' | 'runId' | 'timestamp'>): AutonomyEvent {
    const event: AutonomyEvent = {
      ...entry,
      id: uuid(),
      runId: this.currentRunId,
      timestamp: Date.now(),
    };

    this.events.push(event);
    if (this.events.length > this.MAX_EVENTS) {
      this.events.splice(0, this.events.length - this.MAX_EVENTS);
    }

    this.emit();
    return event;
  }

  getAll(): AutonomyEvent[] {
    return [...this.events];
  }

  getByRunId(runId: string): AutonomyEvent[] {
    return this.events.filter(e => e.runId === runId);
  }

  getByProposalId(proposalId: string): AutonomyEvent[] {
    return this.events.filter(e => e.proposalId === proposalId);
  }

  getByKind(kind: AutonomyEventKind): AutonomyEvent[] {
    return this.events.filter(e => e.kind === kind);
  }

  getRecent(limit = 50): AutonomyEvent[] {
    return this.events.slice(-limit);
  }

  subscribe(listener: EventLogListener): () => void {
    this.listeners.add(listener);
    listener([...this.events]);
    return () => this.listeners.delete(listener);
  }

  snapshot(): Record<string, unknown> {
    return {
      totalEvents: this.events.length,
      currentRunId: this.currentRunId,
      recentEvents: this.getRecent(20),
    };
  }

  private emit(): void {
    const snap = [...this.events];
    this.listeners.forEach(l => l(snap));
  }
}

export const autonomyEventLog = new AutonomyEventLog();
