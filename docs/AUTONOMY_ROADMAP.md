# NexusOS Autonomy Roadmap

This roadmap describes a realistic path from the current NexusOS state toward a genuinely AI-managed OS. It is intentionally implementation-oriented and conservative. It does **not** assume capabilities that are not already evidenced in the repository.

## Scope and framing

NexusOS already has a meaningful base for autonomy work:

- a central shell orchestrator in `App.tsx`
- a Zustand OS store with autonomy-related state
- a VFS with permission checks
- kernel-level services and bridges
- a local AI-related service path (`services/localBrain`)
- test coverage around kernel/store/release-readiness concerns
- build and Electron packaging paths

However, the repo still appears closer to a **cohesive prototype platform** than to a safe, self-evolving AI-managed OS. The main gap is not “more features”; it is **reliability, governance, observability, and controlled change**.

This roadmap focuses on that gap.

## Strategic goal

Move NexusOS from:

- AI-assisted desktop shell

to:

- a platform where AI can propose changes, validate them, stage them safely, observe outcomes, and roll back when needed, with human override always available.

That requires a full control loop, not just a chat surface.

---

# Guiding principles

1. **Safety before autonomy**
   - No self-modification without a policy gate.
   - No execution without an auditable approval path.

2. **Observability before optimization**
   - If the system cannot explain what it is doing, it is not ready to automate it.

3. **Small trusted core**
   - Keep the kernel and governance layer narrower than the UI surface.

4. **Propose, do not assume**
   - AI should generate proposals and plans first, not directly mutate the system by default.

5. **Rollback is a feature, not an emergency**
   - Every meaningful change must have a recovery path.

6. **Human override remains final**
   - A human can pause, deny, inspect, or disable autonomy at any time.

---

# Current-state anchors from the repo

This roadmap is aligned to evidence visible in the repo and docs:

- `App.tsx` still orchestrates major shell behavior and runtime boot flows.
- `store/osStore.ts` already carries autonomy-related state.
- `kernel/fileSystem.ts` already enforces app-context-based permissions and uses a system VFS app ID.
- `kernel/tests/` already contains real tests for file system, permissions, store, release readiness, and error handling.
- `npm run build`, `npm run typecheck`, `npm test`, and `npm run electron:build` are already present as validation/release gates.
- The current docs already describe a layered but still centralised architecture.
- The repo does **not** yet show evidence of a completed policy engine, execution approval system, rollback orchestration, or a fully formal AI governance model.

That means the roadmap must begin with governance and observability, not with “more autonomy.”

---

# Roadmap overview

## Phase 0 — Truth and control baseline
**Goal:** establish a factual map of what the system can currently do, what it must not do, and what is considered safe.

### Milestones
- Define the autonomy scope in concrete terms.
- Identify all actions that can mutate state, files, windows, apps, or persistent storage.
- Inventory current AI entry points and service boundaries.
- Establish a kill-switch and human override path as first-class requirements.
- Create an observable audit trail for decisions and actions.

### Dependencies
- Current architecture documentation
- Store and kernel inspection
- Existing tests
- Build/typecheck confidence

### Acceptance criteria
- There is a written autonomy policy describing allowed, disallowed, and gated actions.
- All state-changing action classes are enumerated.
- Human override is documented and reachable from the shell/runtime design.
- A kill-switch requirement is defined, even if implementation is incomplete.
- Audit logging requirements are defined for AI decisions and runtime actions.

### Explicit blockers
- No reliable action inventory
- No centralized action policy
- No audit trail for autonomy decisions
- No clear separation between suggestion, approval, and execution

### What to build next
- A policy spec for autonomy boundaries
- A runtime action taxonomy
- A decision log format
- A control-plane status model in the store

---

## Phase 1 — Autonomy observability and decision logging
**Goal:** make autonomy visible before making it more powerful.

### Milestones
- Track every AI-generated proposal, decision, approval, and execution event.
- Add timestamps, source context, target subsystem, and outcome to autonomy logs.
- Define an observable state model for autonomy status in the store.
- Surface high-level health signals: idle, proposing, waiting for approval, executing, degraded, blocked, rolled back.

### Dependencies
- Phase 0 policy baseline
- Existing store architecture
- Any current AI bridge or local brain entry points
- Error handling / guard patterns already present in kernel tests

### Acceptance criteria
- The system can explain:
  - what was proposed
  - why it was proposed
  - what approval was required
  - whether it ran
  - whether it succeeded
  - whether rollback happened
- Logs can be correlated by action ID or run ID.
- The autonomy subsystem exposes a current status that is safe to render in UI and safe to inspect in tests.
- A failure in autonomy flow does not silently disappear.

### Explicit blockers
- AI actions have no stable IDs
- Events are not normalized
- Store state does not distinguish proposal vs execution
- Errors are not captured in an actionable form

### Suggested implementation focus
- Introduce a structured autonomy event model
- Add an append-only in-memory or persisted event log
- Add tests for logging shape and state transitions
- Keep the first implementation minimal and deterministic

---

## Phase 2 — Policy engine and permission boundaries
**Goal:** define what AI is allowed to do, in what context, and under which constraints.

### Milestones
- Create a policy layer for autonomy actions.
- Separate read-only observation from write-capable operations.
- Distinguish system actions from app actions from user actions.
- Make approvals context-sensitive:
  - safe auto-approve
  - requires confirmation
  - requires explicit human approval
  - denied by policy

### Dependencies
- Phase 0 action taxonomy
- Phase 1 event model
- Current VFS permission patterns
- Store state for autonomy and kernel rules

### Acceptance criteria
- Every meaningful autonomy action is classified by policy.
- The policy engine can answer:
  - allow
  - deny
  - require approval
  - require staged validation
- The policy decision is logged with the decision reason.
- A missing context does not silently become full trust.
- The system can enforce “system-only” vs “app-only” vs “user-confirmed” scopes.

### Explicit blockers
- Any route that bypasses policy for convenience
- Implicit trust based on missing app context
- Mixed responsibility between UI and kernel for authorization
- Undefined approval thresholds

### Suggested implementation focus
- Start with a small, explicit capability model
- Use deny-by-default for write operations
- Keep policy checks in one place
- Add unit tests for allow/deny behavior

---

## Phase 3 — Proposal → validation loop
**Goal:** require AI to propose changes before anything is staged.

### Milestones
- Introduce a structured “proposal” object for AI-generated changes.
- Validate proposals before execution.
- Require machine-checkable metadata:
  - target
  - risk level
  - affected files or subsystems
  - validation steps
  - rollback plan
  - approval requirement

### Dependencies
- Phase 1 logging
- Phase 2 policy engine
- Existing test runner and typecheck/build commands

### Acceptance criteria
- AI-generated work enters the system as a proposal, not as an immediate mutation.
- Proposals fail fast if they are incomplete.
- Each proposal has a corresponding validation plan.
- Proposals can be rejected without side effects.
- Proposals can be reviewed later from logs or persisted records.

### Explicit blockers
- No proposal schema
- No validation metadata
- No stable run identifier
- No link between proposal and execution

### Suggested implementation focus
- Create a proposal record type
- Build a validation dispatcher for static checks
- Add a state machine for proposal lifecycle
- Keep execution disabled until validation passes

---

## Phase 4 — Test-before-stage execution model
**Goal:** every proposed change must pass through validation and tests before it can stage or deploy.

### Milestones
- Define the full loop:
  - propose
  - validate
  - test
  - stage
  - deploy
  - monitor
  - rollback
- Add explicit validation gates.
- Integrate existing checks:
  - `npm run typecheck`
  - `npm run build`
  - `npm test`
- Define additional targeted tests for autonomy features.

### Dependencies
- Phase 3 proposal format
- Current build/test tooling
- Kernel tests and release-readiness tests

### Acceptance criteria
- A proposal cannot be staged unless its required validation steps pass.
- Validation failures are attached to the proposal record.
- Test results are visible in autonomy status and logs.
- The system can distinguish “not tested” from “failed” from “passed.”
- A failed validation does not trigger deployment.

### Explicit blockers
- No execution gate after validation
- Tests are not associated with a proposal
- Build/typecheck results are not machine-readable in the autonomy flow
- Missing failure propagation

### Suggested implementation focus
- Create a validation pipeline interface
- Treat build/typecheck/test as first-class signals
- Start with local deterministic checks before any advanced AI-based validation
- Add regression tests around the pipeline itself

---

## Phase 5 — Staging and deployment safety
**Goal:** if something is allowed to run, it should run in a controlled environment first.

### Milestones
- Introduce a staging layer for autonomous changes.
- Define what “deploy” means for each kind of action:
  - config update
  - store migration
  - kernel change
  - service change
  - app registration change
- Add staged state, promotion criteria, and rollback triggers.

### Dependencies
- Phase 4 validation loop
- Known runtime boundaries between shell, store, kernel, and services
- Electron/web packaging expectations

### Acceptance criteria
- Changes are staged before they become live where possible.
- Deployment requires an explicit passing condition.
- Staged changes can be inspected before promotion.
- Failed deploys can be reverted to the last known safe state.
- Deployment records show what was changed and by whom/what.

### Explicit blockers
- No staging model
- No rollback snapshot or recovery mechanism
- No stable distinction between local draft and live state
- No deploy status reporting

### Suggested implementation focus
- Start with non-destructive state staging
- Add versioned snapshots for autonomous changes
- Keep deploy semantics narrow and subsystem-specific
- Treat file system and persistence changes as high risk by default

---

## Phase 6 — Rollback and recovery guarantees
**Goal:** make failure recoverable, not catastrophic.

### Milestones
- Define rollback paths for:
  - store state
  - VFS changes
  - app registry changes
  - configuration changes
  - autonomy policy changes
- Add state snapshots and revert mechanics.
- Add failure detection for post-deploy degradation.
- Define a “safe mode” or “autonomy disabled” posture.

### Dependencies
- Phase 5 staging
- Existing VFS and store persistence model
- Error guard and release-readiness tests

### Acceptance criteria
- Every staged or deployed change has a rollback strategy.
- The system can revert to a known-good state.
- Rollback is logged and visible.
- A bad autonomy action cannot permanently lock out human control.
- The system can enter a restricted safe mode when confidence is lost.

### Explicit blockers
- No snapshot model
- No known-good marker
- No rollback execution path
- No safe-mode semantics

### Suggested implementation focus
- Start with configuration/state rollback before code rollback
- Make rollback idempotent where possible
- Ensure rollback itself is policy-checked and logged
- Test rollback paths as carefully as forward paths

---

## Phase 7 — Runtime monitoring and anomaly detection
**Goal:** the OS should notice when autonomy is going wrong.

### Milestones
- Add post-action monitoring.
- Track basic health metrics for:
  - proposal success rate
  - validation failure rate
  - rollback rate
  - action latency
  - permission denials
  - recovery frequency
- Define anomaly thresholds for unsafe autonomy behavior.

### Dependencies
- Phase 1 logs
- Phase 6 rollback model
- Store or kernel-level status surfaces

### Acceptance criteria
- The system can report autonomy health in near real time.
- Repeated failures degrade autonomy confidence.
- Unsafe behavior can automatically reduce scope or disable execution.
- Monitoring data is queryable by subsystem and action type.

### Explicit blockers
- No metrics model
- No post-execution observer
- No confidence or health scoring
- No response to repeated failure patterns

### Suggested implementation focus
- Keep metrics simple at first
- Focus on counters, state transitions, and thresholds
- Avoid premature ML-based anomaly detection
- Make health data useful for humans, not just for automation

---

## Phase 8 — Safe self-evolution
**Goal:** allow the system to improve itself only under strong constraints.

### Milestones
- Define what kinds of self-change are allowed.
- Create a strict boundary for self-modification:
  - safe config tuning
  - feature flag changes
  - app-level improvements
  - kernel changes only with strong approval and testing
- Require additional validation for code generation that affects core runtime.
- Maintain separate trust tiers for:
  - documentation changes
  - UI changes
  - app logic changes
  - kernel changes
  - security/permission changes

### Dependencies
- Phase 2 policy engine
- Phase 4 validation loop
- Phase 6 rollback guarantees
- Phase 7 anomaly detection

### Acceptance criteria
- The system does not self-modify core trust boundaries without elevated checks.
- Self-generated code changes remain reviewable and reversible.
- High-risk changes require stronger validation than low-risk changes.
- The trust tier of each change is recorded and enforced.

### Explicit blockers
- No tiered trust model
- No special handling for kernel/security changes
- No change classification by risk
- No separate approval requirements by subsystem

### Suggested implementation focus
- Separate “self-tuning” from “self-editing”
- Keep core kernel changes human-gated for a long time
- Use safe, narrow automations first
- Do not let the system expand its own privileges

---

## Phase 9 — Human override and incident control
**Goal:** ensure a human can always stop, inspect, and recover the system.

### Milestones
- Implement a visible kill-switch requirement.
- Define autonomy disable/enable controls.
- Add emergency pause behavior for live execution.
- Add operator-friendly incident state reporting.
- Ensure override survives normal runtime failures.

### Dependencies
- Phase 1 status model
- Phase 6 safe mode
- Phase 7 monitoring

### Acceptance criteria
- Human override is always available.
- Autonomy can be paused without uninstalling or corrupting state.
- Kill-switch state is persistent and auditable.
- The system can explain why autonomy was disabled.
- Incident mode is clearly distinguishable from normal operation.

### Explicit blockers
- No override channel
- No persistent disable flag
- No emergency pause semantics
- No incident reporting surface

### Suggested implementation focus
- Make override simple and obvious
- Treat override as a top-level safety primitive
- Ensure manual control is not blocked by autonomy state corruption
- Add tests for disabled-autonomy behavior

---

# Milestone dependency chain

A realistic dependency order is:

1. **Truth and control baseline**
2. **Observability and decision logging**
3. **Policy and permission boundaries**
4. **Proposal → validation**
5. **Test → stage → deploy**
6. **Rollback and recovery**
7. **Monitoring and anomaly detection**
8. **Safe self-evolution**
9. **Human override and incident control**

The system should not skip directly to self-evolution before policy, logs, and rollback exist.

---

# Acceptance criteria for “genuinely AI-managed”

NexusOS should only be considered genuinely AI-managed when all of the following are true:

- AI actions are policy-governed.
- AI decisions are logged and inspectable.
- AI proposals are validated before execution.
- Execution is staged and reversible.
- Rollback is reliable and tested.
- Runtime monitoring can detect unhealthy autonomy behavior.
- Human override is immediate and durable.
- Self-modification is restricted by trust tier and safety checks.
- Core changes remain reproducible through build/test gates.
- The system can explain its autonomy state at any time.

---

# Explicit blockers to watch for

These are the biggest blockers to safe autonomy work in the current repo context:

1. **Monolithic shell logic**
   - `App.tsx` still carries too much responsibility.

2. **Centralised state without strict policy**
   - the store already holds many cross-cutting concerns.

3. **Soft permission boundaries**
   - VFS permissions depend on caller context and must be hardened.

4. **Missing proposal/execution separation**
   - AI must not be able to jump straight to mutation.

5. **No rollback discipline**
   - without rollback, autonomy becomes unsafe very quickly.

6. **Insufficient observability**
   - if autonomy fails silently, the system is not ready.

7. **Unclear change trust tiers**
   - not all edits should be treated equally.

8. **Release confidence still bounded by current build/test maturity**
   - autonomy features should ride on existing `build`, `typecheck`, `test`, and Electron packaging gates.

---

# Recommended near-term sequence

If the team wants the smallest useful next step, do this in order:

1. Write the autonomy policy and action taxonomy.
2. Add structured autonomy logging.
3. Introduce proposal objects and state transitions.
4. Gate execution behind validation.
5. Add rollback for staged changes.
6. Add health metrics and confidence scoring.
7. Add safe mode and human override controls.
8. Only then expand self-evolution capabilities.

This sequence is intentionally conservative. It is the difference between an AI that can **help** run an OS and an AI that can **endanger** one.

---

# Definition of done for the roadmap

This roadmap is complete when the repository has, at minimum:

- a documented autonomy policy
- a capability/permission model for AI actions
- a proposal/validation/execution workflow
- audit logs for autonomy decisions
- rollback and safe mode design
- monitoring and failure detection
- explicit human override requirements
- tests that prove the workflow is enforced

Until then, NexusOS should be treated as an autonomy prototype with promising foundations, not as a self-governing system.