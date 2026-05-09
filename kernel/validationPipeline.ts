import { Proposal, proposalEngine } from './proposalEngine';
import { autonomyEventLog } from './autonomyEventLog';

// ═══════════════════════════════════════════════════════════════════
// VALIDATION PIPELINE v1.0 — Pre-execution Gate
// Every proposal must pass registered validators before execution.
// "Not tested" is distinct from "failed" and "passed".
// Phase 4 of the Autonomy Roadmap.
// ═══════════════════════════════════════════════════════════════════

export type ValidatorResult = {
  stepName: string;
  passed: boolean;
  message: string;
  durationMs: number;
};

export type ValidationStatus = 'not-run' | 'running' | 'passed' | 'failed';

export type ValidatorFn = (proposal: Proposal) => Promise<ValidatorResult>;

export interface PipelineRun {
  proposalId: string;
  status: ValidationStatus;
  results: ValidatorResult[];
  startedAt: number;
  completedAt?: number;
  failureReason?: string;
}

const builtInValidators: ValidatorFn[] = [
  async (proposal) => {
    const start = Date.now();
    const complete =
      proposal.title.trim().length > 0 &&
      proposal.description.trim().length > 0 &&
      proposal.rollbackPlan.trim().length > 0 &&
      proposal.affectedSubsystems.length > 0;
    return {
      stepName: 'proposal-completeness',
      passed: complete,
      message: complete
        ? 'Proposal has all required fields.'
        : 'Proposal is missing title, description, rollback plan, or affected subsystems.',
      durationMs: Date.now() - start,
    };
  },

  async (proposal) => {
    const start = Date.now();
    const requiredSteps = proposal.validationSteps.filter(s => s.required);
    const allDeclared = requiredSteps.every(s => s.name in proposal.validationResults);
    return {
      stepName: 'required-steps-declared',
      passed: allDeclared || requiredSteps.length === 0,
      message: allDeclared || requiredSteps.length === 0
        ? 'All required validation steps are declared.'
        : `Missing results for required steps: ${requiredSteps.filter(s => !(s.name in proposal.validationResults)).map(s => s.name).join(', ')}`,
      durationMs: Date.now() - start,
    };
  },

  async (proposal) => {
    const start = Date.now();
    const dangerousWithoutRollback =
      (proposal.actionClass === 'delete-file' || proposal.actionClass === 'write-file') &&
      proposal.rollbackPlan.toLowerCase() === 'none';
    return {
      stepName: 'rollback-plan-adequacy',
      passed: !dangerousWithoutRollback,
      message: dangerousWithoutRollback
        ? 'Destructive operations require a real rollback plan, not "none".'
        : 'Rollback plan is acceptable for action class.',
      durationMs: Date.now() - start,
    };
  },

  async (proposal) => {
    const start = Date.now();
    const riskPolicyMismatch =
      (proposal.riskLevel === 'critical' || proposal.riskLevel === 'high') &&
      !proposal.approvalRequired;
    return {
      stepName: 'risk-approval-consistency',
      passed: !riskPolicyMismatch,
      message: riskPolicyMismatch
        ? 'High/critical risk proposals must require approval.'
        : 'Risk level and approval requirement are consistent.',
      durationMs: Date.now() - start,
    };
  },
];

class ValidationPipeline {
  private runs: Map<string, PipelineRun> = new Map();
  private extraValidators: ValidatorFn[] = [];

  async run(proposalId: string): Promise<PipelineRun> {
    const proposal = proposalEngine.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    proposalEngine.markValidating(proposalId);

    const run: PipelineRun = {
      proposalId,
      status: 'running',
      results: [],
      startedAt: Date.now(),
    };
    this.runs.set(proposalId, run);

    const validators = [...builtInValidators, ...this.extraValidators];
    const results: ValidatorResult[] = [];

    for (const validator of validators) {
      try {
        const result = await validator(proposal);
        results.push(result);
        proposalEngine.recordValidationResult(proposalId, result.stepName, result.passed);

        if (!result.passed) {
          run.status = 'failed';
          run.failureReason = result.message;
          run.results = results;
          run.completedAt = Date.now();
          this.runs.set(proposalId, run);
          proposalEngine.markValidationFailed(proposalId, result.message);

          autonomyEventLog.append({
            kind: 'proposal-rejected',
            subsystem: 'validation-pipeline',
            actor: 'system',
            summary: `Validation failed at step "${result.stepName}": ${result.message}`,
            proposalId,
            outcome: 'failure',
            errorMessage: result.message,
            metadata: { stepName: result.stepName, results },
          });

          return run;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const errorResult: ValidatorResult = {
          stepName: 'validator-exception',
          passed: false,
          message: `Validator threw: ${msg}`,
          durationMs: 0,
        };
        results.push(errorResult);
        run.status = 'failed';
        run.failureReason = errorResult.message;
        run.results = results;
        run.completedAt = Date.now();
        this.runs.set(proposalId, run);
        proposalEngine.markValidationFailed(proposalId, errorResult.message);
        return run;
      }
    }

    run.status = 'passed';
    run.results = results;
    run.completedAt = Date.now();
    this.runs.set(proposalId, run);

    autonomyEventLog.append({
      kind: 'proposal-validated',
      subsystem: 'validation-pipeline',
      actor: 'system',
      summary: `All ${results.length} validation steps passed for proposal ${proposalId}`,
      proposalId,
      outcome: 'success',
      metadata: { stepCount: results.length, results },
    });

    if (proposal.approvalRequired) {
      proposalEngine.markPendingApproval(proposalId);
    } else {
      proposalEngine.approve(proposalId);
    }

    return run;
  }

  getRun(proposalId: string): PipelineRun | undefined {
    return this.runs.get(proposalId);
  }

  addValidator(fn: ValidatorFn): void {
    this.extraValidators.push(fn);
  }
}

export const validationPipeline = new ValidationPipeline();
