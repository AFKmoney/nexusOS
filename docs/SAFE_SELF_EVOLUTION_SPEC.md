# SAFE SELF-EVOLUTION SPEC

## Status

This document defines the minimum architecture required for safe auto-generation and auto-evolution in the current NexusOS repository context.

It is a specification, not a description of an implemented system. Unless a control is explicitly evidenced in the codebase, this document treats it as **required-but-not-yet-proven**.

---

## 1. Purpose

NexusOS currently has evidence of:

- an Electron + Vite + React + TypeScript application stack (`package.json`)
- a persisted OS store with autonomy-related state (`store/osStore.ts`)
- a virtual file system with app-level permission checks (`kernel/fileSystem.ts`)
- an error guard for AI output validation and recovery (`kernel/errorGuard.ts`)

Those pieces are necessary foundations, but they are not sufficient for safe self-evolution. This spec defines the minimum architecture required to let the system propose changes, validate them, test them, stage them, deploy them, monitor outcomes, and roll back safely.

The central requirement is simple:

> The system must never move from AI-generated change to applied change without a verifiable control loop, scoped capability checks, auditability, and an escape hatch.

---

## 2. Evidence-Based Constraints From the Repo

### 2.1 Package/runtime reality

From `package.json`:

- The app is a TypeScript project using strict type checking.
- Primary scripts currently include:
  - `build`
  - `typecheck`
  - `test`
  - `electron:build`
- There is no evidence in `package.json` of a dedicated deployment pipeline for AI-generated changes.
- There is no evidence of a formal rollback subsystem.
- There is no evidence of signed change bundles, staged artifact promotion, or approval gates.

Implication: any safe self-evolution architecture must be built on top of the existing build/test scripts rather than assuming a new platform already exists.

### 2.2 File system constraints

From `kernel/fileSystem.ts`:

- The virtual file system persists to local storage.
- App access is checked through `appId` and permission strings like `vfs.read` and `vfs.write`.
- `SYSTEM_VFS_APP_ID` bypasses app restrictions.
- Missing `appId` is explicitly denied for permission checks.
- File operations emit events for some actions (`VFS_FILE_CREATED`, `VFS_FILE_MODIFIED`, `VFS_FILE_DELETED`, `VFS_DIR_CREATED`).

Implication: the VFS already has a permission boundary concept, but it is only a low-level file access control. Safe self-evolution needs a higher-level capability model that governs code generation, validation, staging, deployment, and rollback as distinct operations.

### 2.3 Store/autonomy state reality

From `store/osStore.ts`:

- The store already contains autonomy-related state fields:
  - `autonomyState`
  - `autonomyLog`
  - `currentObjective`
  - `currentSelfPrompt`
  - `aiManagedStoreEnabled`
  - `daemonLocked`
  - `daemonLockLog`
  - `isForging`
- There is a `systemReset(wipe)` action that can clear local storage and reload the app.
- AI initialization is deferred after login through `localBrain.initialize()`.

Implication: the app already has the idea of autonomy state, but the store does not prove a complete lifecycle for AI-managed changes. It is not enough to hold state; the system needs an explicit change-execution protocol with durable logs.

### 2.4 Output validation reality

From `kernel/errorGuard.ts`:

- The error guard validates:
  - HTML completeness
  - JSON parseability
  - bracket balance in code blocks
  - some OS action syntax
  - hallucinated app IDs in `OS::OPEN_APP`
- It can attempt surgical repair.
- It can re-prompt `localBrain` if available.
- It tracks correction stats.

Implication: this is useful as an output-shape validator, but it is not a self-evolution governance engine. It validates responses; it does not authorize system changes, stage artifacts, or enforce a deploy/rollback policy.

---

## 3. Minimum Safe Self-Evolution Architecture

A safe self-evolution system in this repo should be structured as a controlled pipeline with the following stages:

1. propose
2. validate
3. test
4. stage
5. deploy
6. monitor
7. rollback

Each stage must be separable, logged, and individually gated.

### 3.1 Propose

The AI may generate a proposed change set, but it must not directly mutate production state.

A proposal must include:

- intent / objective
- target subsystem
- affected files or resources
- expected user impact
- risk classification
- required permissions
- validation plan
- test plan
- rollback plan

Required rule:
- If a proposal cannot name its target and rollback path, it is invalid.

### 3.2 Validate

Validation must occur before any test or execution step.

Validation checks should include:

- schema/format validation of the proposal record
- capability check against allowed scope
- diff safety checks
- VFS path safety checks
- app identity checks
- policy checks for forbidden operations
- human override state checks
- output-shape validation for AI-generated artifacts

The existing `kernel/errorGuard.ts` can be treated as one input to validation, but not the full validation system.

Required rule:
- Validation must fail closed. Unclear or missing metadata is treated as denial, not permission.

### 3.3 Test

The system must run tests before staging.

At minimum, test execution must include the repository’s existing gates as applicable:

- `npm run typecheck`
- `npm run build`
- `npm run test`

The spec does not assume those commands are always sufficient for every change, but they are the baseline proof-of-safety in this repo context.

Required rule:
- A change cannot be deployed if it does not have a completed test record attached to the change bundle.

### 3.4 Stage

Staging is a non-production holding area for generated artifacts.

Stage requirements:

- artifacts are written to a staging namespace or temporary location, not directly to active runtime paths
- staged artifacts are immutable once sealed
- staged items are versioned and linked to a proposal ID
- staging must preserve before/after state for rollback

In the current repo context, this means staging cannot be implied by `writeFile` into the active VFS alone. A separate staging contract is required.

Required rule:
- No direct deploy from proposal output to active state without staging.

### 3.5 Deploy

Deployment is an explicit promotion from staging into active use.

Deploy requirements:

- only signed-off or policy-approved staged artifacts may be promoted
- deployment must be atomic where possible
- partial deployment must be detectable and recoverable
- deployment must record the exact target state, actor, and timestamp
- deployment must emit an audit event

Required rule:
- If deployment cannot be proven complete, the system remains in the pre-deploy state.

### 3.6 Monitor

After deploy, the system must monitor for regressions.

Monitoring signals should include:

- runtime errors
- failed validations
- VFS permission denials
- autonomy-loop failures
- rollback triggers
- user override events
- store state anomalies

Monitoring must be tied to the specific deployment version, not only the generic app state.

Required rule:
- No deployment is considered safe until it has a monitor window and health criteria.

### 3.7 Rollback

Rollback must restore the previous known-good state.

Rollback requirements:

- rollback must be available for every deployed change
- rollback must restore both files/resources and relevant state
- rollback must be testable
- rollback must be logged as a first-class event
- rollback must be manual and/or automatic based on policy

Required rule:
- If the system cannot roll back a change, it must not be allowed to self-deploy that change.

---

## 4. Capability Model

The current VFS permission model is necessary but too coarse for self-evolution. A safe architecture needs a capability model with explicit scopes.

### 4.1 Required capability tiers

At minimum, the system should distinguish these capabilities:

- `proposal:create`
- `proposal:read`
- `proposal:approve`
- `validation:run`
- `test:run`
- `stage:write`
- `deploy:promote`
- `monitor:read`
- `rollback:execute`
- `audit:read`
- `audit:write`
- `policy:admin`
- `kill-switch:activate`

### 4.2 Scope rules

Capabilities must be scoped by:

- actor identity
- app identity
- target path or subsystem
- environment/state phase
- risk class

Example policy constraints:

- A proposal generator may create proposals, but cannot stage or deploy them.
- A validator may read proposals and report status, but cannot change production state.
- A deployer may promote only validated and approved artifacts.
- A rollback executor may revert only within the rollback window or by explicit override policy.
- The system itself should not receive blanket `SYSTEM_VFS_APP_ID`-style omnipotence for self-evolution actions.

### 4.3 Separation of concerns

The architecture must separate:

- content generation authority
- state mutation authority
- deployment authority
- rollback authority
- audit authority
- override authority

This prevents a single compromised or hallucinated action path from moving directly from output generation to system mutation.

---

## 5. Audit Log Requirements

A safe self-evolution system must produce a durable audit trail.

### 5.1 Required audit entries

Each self-evolution event should record:

- unique change ID
- proposal ID
- actor identity
- capability used
- requested action
- approval/denial result
- validation result
- test result
- staging result
- deployment result
- monitor result
- rollback result
- timestamp
- affected paths/resources
- hash or checksum of artifacts where possible
- error details and policy decision rationale

### 5.2 Audit properties

Audit logs must be:

- append-only in normal operation
- tamper-evident where possible
- queryable by deployment ID and time range
- readable under the right capability
- protected from casual deletion or overwrite

### 5.3 Relation to current repo

The current `autonomyLog` and `daemonLockLog` fields in `store/osStore.ts` are evidence that log concepts already exist in state. However, the spec requires more than counters or UI logs; it requires an operational audit ledger for change governance.

---

## 6. Required Control Loop

The system must implement the following loop for every AI-driven change:

### propose -> validate -> test -> stage -> deploy -> monitor -> rollback

#### Step details

1. **propose**
   - create a structured change request
   - include rollback plan and test plan

2. **validate**
   - check permissions, policy, path safety, and proposal completeness

3. **test**
   - execute relevant automated tests and record outputs

4. **stage**
   - write artifacts to isolated staging state

5. **deploy**
   - promote staged artifacts after approval/policy checks

6. **monitor**
   - observe health and collect evidence of success/failure

7. **rollback**
   - revert if monitoring fails or policy requires reversal

### Loop invariants

- Every stage must be represented in logs.
- Every stage must be independently fail-closed.
- A later stage cannot imply that an earlier stage succeeded unless there is evidence.
- Rollback must preserve evidence for postmortem analysis.

---

## 7. Kill-Switch Requirements

A kill-switch is mandatory.

### 7.1 Behavior

The kill-switch must:

- immediately halt autonomous mutation activity
- prevent new proposal-to-deploy transitions
- allow read-only inspection and audit retrieval
- preserve logs and state for diagnosis
- be reversible only through authorized action

### 7.2 Triggers

The kill-switch should be activatable by:

- human operator action
- policy breach detection
- repeated validation/test failure
- unexpected rollback loop
- missing audit trail
- capability mismatch
- corrupted state
- any other critical safety condition defined by policy

### 7.3 Current repo relation

`store/osStore.ts` already has `daemonLocked`, `daemonLockLog`, and `systemReset`. That is not the same thing as a real kill-switch, but it suggests a place where such controls could be modeled.

Required rule:
- The kill-switch must be able to stop self-evolution without requiring the same subsystem that it is stopping.

---

## 8. Human Override Requirements

Human override is mandatory for high-risk operations.

Override capabilities should include:

- approval of high-risk deployment
- forced rollback
- kill-switch activation
- restoration from a safe checkpoint
- clearing a blocked autonomous state

Override operations must be:

- visible in the audit log
- attributable to a human actor
- scoped by role
- denied by default if identity is uncertain

---

## 9. Safety Boundaries for File and State Mutation

Because NexusOS includes a virtual file system and persisted UI/store state, the architecture must distinguish between:

- AI-generated text
- staged content
- active VFS files
- application state in the store
- runtime-only state

Required controls:

- proposal output cannot directly mutate active files
- active file writes must be gated by capability and stage state
- store mutations that affect autonomy state must be logged
- filesystem writes should respect app permissions and target scope
- system-level overrides such as `SYSTEM_VFS_APP_ID` must be reserved for narrowly defined platform operations, not general self-evolution

---

## 10. Minimal Acceptance Criteria

A safe self-evolution subsystem in this repo should not be considered ready unless it can demonstrate all of the following:

1. A proposal record is created before any mutation.
2. Validation can reject unsafe, incomplete, or unauthorized proposals.
3. Test commands run and their results are attached to the change record.
4. Staged artifacts are isolated from active state.
5. Deployment requires explicit promotion.
6. Deployment writes an audit entry.
7. Monitoring is linked to the deployed version.
8. Rollback restores a known-good state.
9. A kill-switch halts autonomy immediately.
10. Human override can supersede the autonomous path.

---

## 11. What Exists vs. What Is Still Missing

### Exists or is evidenced
- TypeScript/Electron/Vite application structure
- strict type checking and test/build scripts
- VFS permission checks on file operations
- basic AI output validation and repair logic
- autonomy-related store fields and logs

### Still missing or not evidenced
- formal change proposal schema
- policy engine for autonomous code/state mutation
- explicit stage/deploy/monitor/rollback pipeline
- immutable audit ledger
- fine-grained capability model for self-evolution
- signed approval or human signoff workflow
- kill-switch semantics with guaranteed halt behavior
- versioned staging area for generated artifacts
- rollback metadata and recovery checkpoints
- observability tied to deployment IDs

---

## 12. Implementation Principle

The minimum safe architecture should follow this principle:

> AI may suggest. Policy may permit. Tests may prove. Only then may the system stage. Only after staging may it deploy. Only after deployment may it monitor. If monitoring fails, it rolls back.

That sequence must remain explicit in code and state, not implied by UI flow or optimistic assumptions.

---

## 13. Non-Goals

This spec does not claim:

- that self-evolution is already implemented
- that current validation is sufficient for code deployment
- that current logs are sufficient for auditability
- that current VFS permissions are enough to secure autonomous mutation
- that the existing system can safely modify itself without additional governance

Those capabilities require dedicated implementation work.

---

## 14. Summary

The current repository has foundational components for AI-aware operation, but safe auto-generation and auto-evolution require a much stricter architecture:

- a controlled proposal pipeline
- a fail-closed validator
- test gating
- isolated staging
- explicit deployment
- version-linked monitoring
- guaranteed rollback
- durable audit logs
- scoped capabilities
- a true kill-switch
- human override for high-risk decisions

Without those controls, autonomous self-evolution would be unsafe and should remain disabled.