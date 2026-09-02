import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Browser-global shims required by the kernel imports.
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  } as any;
}
if (typeof global.navigator === 'undefined') {
  Object.defineProperty(global, 'navigator', { value: { hardwareConcurrency: 4 }, writable: true });
}
if (typeof global.window === 'undefined') {
  (global as any).window = {};
}

// autoPilot.ts pulls a deep import graph (puterService/aiProviders). The
// runTests harness force-exits, so we wrap the import so the file still loads
// and tests skip gracefully if the graph fails under Node.
let autopilot: { autoPilot: any; AutoPilotEngine: any; detectGoalOutcome: any; extractFailure: any } | null = null;
let toolForge: any = null;
let memory: any = null;
let orchestrator: any = null;
try {
  autopilot = require('../autoPilot.ts');
  toolForge = require('../toolForge.ts').toolForge;
  memory = require('../memory.ts').memory;
  orchestrator = require('../agentOrchestrator.ts');
} catch (e: any) {
  autopilot = null;
}

const realExecuteToolCalls = toolForge?.executeToolCalls;
const realExecuteOsActions = toolForge?.executeOsActions;

function makeGoal(id: string, description = `goal ${id}`): any {
  return { id, description, status: 'in-progress', priority: 'normal', createdAt: 1, attempts: 1 };
}

describe('AutoPilot v3 — action loop, planning & mission memory', () => {
  before(() => {
    // Patch the tool executor so tool-loop tests don't touch the real OS.
    if (toolForge) {
      toolForge.executeToolCalls = async (tc: any[]) => `did ${tc.length} tools`;
      toolForge.executeOsActions = async () => 'os done';
    }
  });

  after(() => {
    if (toolForge) {
      if (realExecuteToolCalls) toolForge.executeToolCalls = realExecuteToolCalls;
      if (realExecuteOsActions) toolForge.executeOsActions = realExecuteOsActions;
    }
    // Leave no autoPilot/mission entries behind that could pollute other tests.
    if (memory) {
      try { memory.findByTag('mission').forEach((m: any) => memory.forget(m.id)); } catch {}
    }
  });

  it('strictly requires the engine', () => {
    assert.ok(autopilot, 'autoPilot.ts import graph');
  });

  it('detectGoalOutcome classifies complete/failed/continue', () => {
    const d =
      autopilot!.detectGoalOutcome;
    assert.equal(d('GOAL_COMPLETE'), 'complete');
    assert.equal(d('all done GOAL:COMPLETE'), 'complete');
    assert.equal(d('GOAL_FAILED: something'), 'failed');
    assert.equal(d('STEP COMPLETE'), 'complete');
    assert.equal(d('step DONE'), 'complete');
    assert.equal(d('still working...'), 'continue');
    assert.equal(d(''), 'continue');
  });

  it('extractFailure pulls the reason after GOAL_FAILED', () => {
    assert.equal(autopilot!.extractFailure('GOAL_FAILED: no file found'), 'no file found');
    assert.equal(autopilot!.extractFailure('no marker'), 'Unknown failure');
  });

  it('parsePlan handles JSON steps and object steps, and rejects non-JSON', () => {
    const P = autopilot!.AutoPilotEngine.parsePlan;
    assert.deepEqual(P('wrap {"steps":["a","b"]} wrap'), ['a', 'b']);
    assert.deepEqual(P('{"plan":[{"description":"x"},{"description":"y"}]}'), ['x', 'y']);
    assert.deepEqual(P('{"steps":["a",{"description":"b"}]}'), ['a', 'b']);
    assert.deepEqual(P('no json here'), []);
    assert.deepEqual(P('{"steps":[]}'), []);
  });

  it('executeGoal actually executes model tool calls before completing', async () => {
    let calls = 0;
    const result = await autopilot!.autoPilot.executeGoal(makeGoal('g1', 'fix the widgets'), {
      generate: async () => {
        calls++;
        if (calls === 1) return { text: 'inspecting', toolCalls: [{ type: 'function', function: { name: 'read_file', arguments: '{}' } }] };
        return { text: 'all fixed GOAL_COMPLETE', toolCalls: [] };
      },
      maxTurns: 5,
    });
    assert.equal(result.outcome, 'complete');
    assert.equal(calls, 2);
    // The tool call was executed (via the patched executor) and its output fused back in.
    assert.match(result.transcript, /TOOL RESULTS/);
    assert.match(result.transcript, /did 1 tools/);
  });

  it('executeGoal honors GOAL_FAILED via extractFailure', async () => {
    const result = await autopilot!.autoPilot.executeGoal(makeGoal('g2'), {
      generate: async () => ({ text: 'GOAL_FAILED: could not build', toolCalls: [] }),
      maxTurns: 2,
    });
    assert.equal(result.outcome, 'failed');
    assert.match(result.transcript, /GOAL_FAILED: could not build/);
  });

  it('executeGoal stops at the turn cap with outcome continue', async () => {
    let n = 0;
    const result = await autopilot!.autoPilot.executeGoal(makeGoal('g3'), {
      generate: async () => { n++; return { text: `working turn ${n}`, toolCalls: [] }; },
      maxTurns: 3,
    });
    assert.equal(result.outcome, 'continue');
    assert.equal(n, 3);
  });

  it('planGoal persists a structured multi-step plan on the goal', async () => {
    const g = await autopilot!.autoPilot.addGoal('ship release 3', 'high');
    const ok = await autopilot!.autoPilot.planGoal(g.id, ['draft', 'review', 'publish']);
    assert.equal(ok, true);
    const plan = autopilot!.autoPilot.getPlan(g.id);
    assert.equal(plan.length, 3);
    assert.deepEqual(plan.map((s: any) => s.description), ['draft', 'review', 'publish']);
    assert.ok(plan.every((s: any) => s.status === 'pending'));
    // A plan on a non-existent goal returns false.
    assert.equal(await autopilot!.autoPilot.planGoal('nope', ['x']), false);
  });

  it('goal completion writes tagged, recallable mission memory', async () => {
    const g = await autopilot!.autoPilot.addGoal('write a monthly report');
    await autopilot!.autoPilot.completeGoal(g.id, 'report written and saved');
    const hits = memory!.findByTag('mission').filter((m: any) => m.content.includes('AUTOPILOT MISSION DONE'));
    assert.ok(hits.length >= 1, 'expected a mission-done memory entry');
    assert.ok(hits[0].tags.includes('goal-' + g.id));
    // Semantic recall surfaces it.
    const rec = memory!.recall('monthly report', 2000);
    assert.ok(rec.some((m: any) => m.content.includes('AUTOPILOT MISSION DONE')));
  });

  it('goal failure writes a failed mission memory', async () => {
    const g = await autopilot!.autoPilot.addGoal('deploy the service');
    await autopilot!.autoPilot.failGoal(g.id, 'port in use');
    const hits = memory!.findByTag('mission').filter((m: any) => m.content.includes('AUTOPILOT MISSION FAILED'));
    assert.ok(hits.length >= 1);
    assert.match(hits[0].content, /port in use/);
  });
});

describe('AgentOrchestrator — plan parsing & deps', () => {
  it('parsePlan handles subtasks, roles, and dependency indices', () => {
    const P = orchestrator!.AgentOrchestrator.parsePlan;
    const out = P('prefix {"subtasks":[{"description":"build x","role":"coder"},{"description":"test x","role":"tester","dependsOn":["0"]}]} tail', 't-1');
    assert.equal(out.length, 2);
    assert.equal(out[0].id, 't-1-sub-0');
    assert.equal(out[0].assignedRole, 'coder');
    assert.equal(out[1].assignedRole, 'tester');
    assert.deepEqual(out[1].dependsOn, ['t-1-sub-0']);
  });

  it('parsePlan defaults role to coder and drops empty descriptions', () => {
    const P = orchestrator!.AgentOrchestrator.parsePlan;
    const out = P('{"subtasks":[{"description":""},{"description":"x"}]}', 't-2');
    assert.equal(out.length, 1);
    assert.equal(out[0].assignedRole, 'coder');
  });

  it('parsePlan returns [] on malformed text or missing subtasks', () => {
    const P = orchestrator!.AgentOrchestrator.parsePlan;
    assert.deepEqual(P('no json', 't-3'), []);
    assert.deepEqual(P('{"not_subtasks":[]}', 't-3'), []);
    assert.deepEqual(P('{bad json', 't-3'), []);
    assert.deepEqual(P('{"subtasks":[]}', 't-3'), []);
  });
});
