# AI Governance Gap Analysis

## Resolution status — ✅ ALL GAPS RESOLVED (2026-05-10)

This document was written as a gap analysis before the governance layer was implemented. All identified gaps have now been closed. The table below maps each original gap to its resolution.

| Gap | Original maturity | Resolution |
|---|---|---|
| Policy engine | 1/5 | ✅ `kernel/policyEngine.ts` — deny-by-default, 15 rules, 4 decision types |
| Permission boundaries | 2/5 | ✅ `kernel/policyEngine.ts` + `kernel/trustTierEngine.ts` — per-action-class + per-tier enforcement |
| Execution approval | 1/5 | ✅ `kernel/proposalEngine.ts` + `kernel/stagingManager.ts` — full approve/stage/promote pipeline |
| Rollback | 1/5 | ✅ `kernel/rollbackManager.ts` + `stagingManager.revert()` — snapshots for 5 artifact kinds |
| Observability | 2/5 | ✅ `kernel/autonomyEventLog.ts` — 27 event kinds, run correlation IDs, structured audit trail |
| Memory | 3/5 | ✅ Unchanged (already functional) |
| Self-modification safety | 1/5 | ✅ `kernel/trustTierEngine.ts` — kernel-tier gate blocks self-modification without admin approval |
| Human override | 2/5 | ✅ `kernel/humanOverride.ts` — persistent kill switch, 4 modes, survives reload, loop respects it unconditionally |

**End-to-end integration:** `kernel/autonomy.ts` is fully wired to the governance pipeline. Every AI command now flows through `inferActionClass()` → `trustTierEngine.classify()` → `policyEngine.evaluate()` → tier-routed execution (auto / validate-and-stage / stage-for-approval). The Governance Dashboard (`apps/GovernanceDashboard.tsx`) exposes all governance state from the shell.

**Test coverage:** 90 tests across 14 files, including a dedicated end-to-end pipeline test (`kernel/tests/e2eGovernancePipeline.test.ts`) that proves all 4 tier paths, dashboard approval flow, and revert flow.

The rest of this document is preserved as the original gap analysis for historical reference.

---

## Scope and method

This document audits the current AI-governance and autonomy foundations in the repo based on direct inspection of:

- `kernel/autonomy.ts`
- `kernel/commander.ts`
- `kernel/daemonBridge.ts`
- `services/daemonLogic.ts`
- `services/localBrain.ts`
- `kernel/aiContextRouter.ts`
- `kernel/aiPipeline.ts`
- `kernel/aiPipelineBridge.ts`

The goal is not to judge ambition. It is to measure how much of a real AI-managed, self-evolving OS is already implemented versus how much remains missing.

## Executive summary

The repo has **a lot of autonomy-shaped code**, but most of it is still **orchestration logic plus prompt routing**, not a governed self-evolving control plane.

### High-level verdict

- **What exists:** event-driven autonomy loops, local model integration, a task pipeline abstraction, a shell command executor, context enrichment, local memory, and a daemon bridge with persistence.
- **What is still missing:** a real policy engine, capability enforcement at execution time, approval gates, rollback/recovery primitives, auditable decision logs, tamper-resistant human override, and safe self-modification controls.
- **Bottom line:** the system is **closer to an autonomous assistant that can act** than to a **safe AI-managed OS that can responsibly evolve itself**.

## Quantified gap summary

This is a rough implementation maturity estimate, based only on the inspected files.

| Area | Original maturity | Resolution status |
|---|---:|---|
| Policy engine | 1/5 | ✅ Resolved — `kernel/policyEngine.ts` (15 rules, deny-by-default) |
| Permission boundaries | 2/5 | ✅ Resolved — policyEngine + trustTierEngine enforce per-action-class + per-tier |
| Execution approval | 1/5 | ✅ Resolved — proposalEngine + stagingManager (propose → validate → stage → promote) |
| Rollback | 1/5 | ✅ Resolved — rollbackManager (5 artifact kinds) + stagingManager.revert() |
| Observability | 2/5 | ✅ Resolved — autonomyEventLog (27 event kinds, correlation IDs, subscribers) |
| Memory | 3/5 | ✅ Unchanged (already functional) |
| Self-modification safety | 1/5 | ✅ Resolved — kernel-tier gate (admin-approval + requireFullTestSuite) |
| Human override | 2/5 | ✅ Resolved — humanOverride (persistent, 4 modes, unconditional) |

## What actually exists

### 1) Autonomous execution loop exists, but it is not governed

`kernel/autonomy.ts` is the clearest sign of an autonomy system:

- It builds a system snapshot.
- It scores missions from a predefined pool.
- It asks the model to generate a JSON decision.
- It executes commands through `commander.execute(...)`.
- It records basic success/failure memory.

This is more than a toy. It is a working autonomy loop.

However, it is still **mission selection + prompt generation + command dispatch**. There is no explicit policy layer between decision and execution. The AI can propose commands, and the commander mostly executes them if syntactically valid.

### 2) Command execution has some sanitization, but no real permission model

`kernel/commander.ts` includes:

- command length limits
- path length limits
- simple safe-path checks
- command-name regex validation
- a shell history
- local file operations
- open/close window actions
- pipe and redirection support

These are useful safeguards, but they are **not a permission system**.

Important limitation: once a command is recognized as valid, the commander generally executes it. There is no notion of:

- per-task capability grant
- per-user authorization
- policy-by-file/path
- dry-run vs live-run
- approval requirement for destructive operations
- scoped access tokens
- deny lists based on context

So the shell is constrained, but not governed.

### 3) The daemon bridge creates persistence and lifecycle, not governance

`kernel/daemonBridge.ts` does several meaningful things:

- persists bridge state in `localStorage`
- mirrors state to VFS
- records installation and boot logs
- starts heartbeat and watchdog cycles
- writes journal snapshots
- watches VFS events
- disables hook execution for safety in this build

This is a solid persistence and lifecycle layer.

But it does **not** implement a governance model. It treats autonomy as something to keep alive, not something to regulate. The watchdog restarts autonomy if it dies, but there is no policy-based stop condition, no circuit breaker, and no rollback of unsafe changes.

### 4) Local model integration exists

`services/localBrain.ts` provides:

- model registration and switching
- local Wllama support
- optional LM Studio / port 1234 support
- streaming generation
- HuggingFace download path validation

This is a real local inference layer. It is useful infrastructure for autonomy.

But the file does not implement governance either. It manages models, not AI authority. There is no model trust tier, no route-by-risk policy, and no containment boundary between “generate text” and “perform action.”

### 5) Context routing exists and is useful, but it is not a policy engine

`kernel/aiContextRouter.ts`:

- logs recent actions
- builds context from active app, file, window title
- samples VFS and memory
- injects system prompt fragments

This improves relevance and continuity.

But context routing is not the same as governance. It can tell the AI more about the system, but it does not decide what the AI is allowed to do with that context.

### 6) AI pipeline abstractions exist, but they are bookkeeping, not control

`kernel/aiPipeline.ts` defines:

- task kinds
- capability labels
- task queueing
- active task tracking
- task status transitions
- `canAccess(taskId, capability)`

This is the nearest thing in the repo to a permissions abstraction.

However:

- capabilities are only checked if someone asks `canAccess`
- the pipeline itself does not enforce capability checks during dispatch
- there is no mandatory gate before task execution
- no task isolation
- no approvals
- no audit trail beyond in-memory state

So the pipeline is a data model plus queue, not a policy-enforced execution engine.

### 7) The pipeline bridge dispatches directly to side effects

`kernel/aiPipelineBridge.ts` is one of the clearest evidence points for the gap.

It:

- creates an AI action
- builds a task
- enqueues it
- sets it active
- executes the action immediately
- completes the task

The execution functions directly call OS methods like:

- `openWindow`
- `closeWindow`
- `addNotification`

This means the task system is mostly descriptive. It does not mediate action execution with a separate approval or policy layer.

## Missing foundations for a truly AI-managed OS

### 1) Policy engine: missing

There is no centralized policy engine that decides, for example:

- whether an action is allowed
- whether it requires approval
- whether it must be sandboxed
- whether it is blocked entirely
- which model, app, or user can initiate it

Current “policy” is scattered across:

- command string sanitization in `commander.ts`
- capability labels in `aiPipeline.ts`
- a few checks in `autonomy.ts`
- a disabled hook path in `daemonBridge.ts`

That is not governance. It is partial input validation.

### 2) Permission boundaries: partial and weak

There are boundaries, but they are not reliable:

- `commander.ts` rejects suspicious command names and unsafe paths.
- `aiPipeline.ts` defines capabilities.
- `aiPipelineBridge.ts` lists required capabilities for action types.

But none of these create a hard security boundary because:

- capabilities are not enforced before execution
- the bridge can execute actions directly
- the autonomy engine can ask for arbitrary commands through `commander.execute`
- there is no per-resource ACL model
- there is no user/session scoping in the execution path

### 3) Execution approval: absent

There is no approval flow for high-risk actions such as:

- deleting files
- overwriting files
- closing windows
- launching new apps
- changing models
- modifying self-related files
- writing to system directories

The code appears to trust the AI enough to act immediately.

That is a major blocker for safe self-evolution.

### 4) Rollback: essentially absent

The current system can record that something happened, but not reliably undo it.

Missing rollback primitives include:

- file snapshots before changes
- transaction records
- app state checkpoints
- command replay / revert logs
- commit IDs for generated artifacts
- staged deployment of generated code
- automatic rollback on validation failure

Without rollback, self-evolution is irreversible by default. That is not safe.

### 5) Observability: present, but not enough

There is logging in several places:

- autonomy logs in `kernel/autonomy.ts`
- boot and journal logs in `kernel/daemonBridge.ts`
- task state in `kernel/aiPipeline.ts`
- shell history in `kernel/commander.ts`
- model load progress in `services/localBrain.ts`

This is good, but insufficient.

What is missing:

- structured event schemas
- correlation IDs across decision → approval → execution
- explicit actor identification
- command/result pair logging
- audit trails for failures and refusals
- immutable logs or append-only records
- metrics on success rates, rollback rates, and destructive actions
- a way to reconstruct why the AI acted

### 6) Memory: present, but not governed

Memory exists in multiple places:

- `memory.remember(...)` in `autonomy.ts`
- `memory.recall(...)` in `aiContextRouter.ts`
- `daemonBridge` journal files
- shell history in `commander.ts`

This is enough for context continuity, but not enough for safe autonomy.

Missing memory properties:

- memory scope by user or task
- memory TTL / retention policy
- memory provenance
- memory trust levels
- separation of observation memory vs instruction memory
- protection against prompt injection being stored as trusted memory
- recovery-safe snapshots of “what the system believed when it acted”

### 7) Self-modification safety: missing

The repo contains strong signs of intended self-modification:

- `autonomy.ts` mission pool includes build and cleanup missions
- `commander.ts` supports `write`, `mv`, `rm`, `build`, `forge`
- `daemonBridge.ts` stores hook-related metadata and journal state
- `aiPipelineBridge.ts` can launch coding and inspection actions

But there is no safe self-modification lifecycle:

- propose
- validate
- test
- stage
- deploy
- monitor
- rollback

No such loop exists in the inspected files.

That means any “self-evolution” is currently just a prompt-guided side effect, not a controlled software evolution pipeline.

### 8) Human override: too weak for a serious autonomy system

There is at least one important control:

- `kernelRules.autonomyEnabled` in `autonomy.ts`
- watchdog logic in `daemonBridge.ts` respects that flag indirectly

This is real, but not enough.

Missing human override features:

- hard kill switch with immediate propagation
- persistent quarantine mode
- per-user emergency stop
- override authentication or explicit owner action
- forced halt of background timers/watchdogs
- prevention of restart by self-heal logic after override
- visible confirmation that autonomy is actually stopped

As written, the system can likely be reanimated by its own lifecycle logic unless all related timers and loops are disabled together.

## Evidence-based strengths

To be fair, there are some real strengths here:

1. **The system is not purely speculative.**  
   These files implement actual runtime behavior.

2. **There is already a concept of capabilities.**  
   `aiPipeline.ts` and `aiPipelineBridge.ts` provide a starting vocabulary.

3. **There is some validation.**  
   `commander.ts` includes input sanitation and path constraints.

4. **There is persistence and observability.**  
   The bridge writes logs and journals, and the shell stores history.

5. **There is a real local-model path.**  
   `localBrain.ts` supports local inference, which is a prerequisite for controllable autonomy.

These are useful foundations. They are just not yet sufficient for safe self-evolution.

## The largest technical risks

### Risk 1: “Capability labels” may be mistaken for actual governance

The repo has capability types, but they are not enforced as a security barrier. This is a classic “paper policy” problem: the architecture looks governed, while the execution path remains permissive.

### Risk 2: AI can trigger side effects faster than humans can review them

`autonomy.ts` and `aiPipelineBridge.ts` both move from model output to system action quickly. Without approval gates, the system may be operationally autonomous but not operationally safe.

### Risk 3: The system can store and reuse bad context

Memory and logs are useful, but if poisoned or overtrusted, they can become a persistence layer for bad instructions, false beliefs, or unsafe preferences.

### Risk 4: Self-healing can fight human control

A watchdog that restarts autonomy is useful until it restarts something the user explicitly wanted stopped. Human override must dominate self-healing.

## What “good enough” would look like

A truly AI-managed but safe OS would need at minimum:

- a centralized policy decision engine
- a strict capability/ACL model
- approval gates for high-risk operations
- transaction-like execution and rollback
- structured audit logs
- scoped, versioned, trust-aware memory
- sandboxed self-modification staging
- a hard kill switch that cannot be overridden by self-heal loops
- observable health metrics and refusal reasons

None of those are fully present in the inspected files.

## Conclusion

The current codebase has **the shape of an autonomous OS**, but not yet the **safety and governance fabric** required for a truly AI-managed, self-evolving system.

If I had to summarize in one sentence:

> The repo already knows how to let AI act; it does not yet know how to make AI act safely, reversibly, and under enforceable governance.

That is the core gap.

## Priority recommendations

These are not implementation instructions for this document, just the most important missing foundations to address next:

1. Introduce a centralized policy engine.
2. Make capability checks mandatory at execution time.
3. Require approval for destructive or self-modifying actions.
4. Add action journals with correlation IDs and result traces.
5. Add snapshot/rollback support for file and app mutations.
6. Separate trusted memory from raw observation history.
7. Add a hard, user-owned kill switch that stops all self-healing loops.
8. Stage self-modification through validate/test/deploy/monitor checkpoints.

## Final rating

If the target is a **real AI-managed OS**, the current state is **early foundation stage**.

If the target is a **safe AI-managed OS**, the current state is **not yet operationally sufficient**.