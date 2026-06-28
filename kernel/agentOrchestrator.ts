// ═══════════════════════════════════════════════════════════════════
// AGENT ORCHESTRATOR — Multi-agent task delegation
//
// Spawns sub-agents with specific roles to handle complex tasks. Each
// agent has its own context window, its own autonomy loop, and can
// communicate with other agents via the eventBus.
//
// Agent roles:
//   - planner:  breaks a task into subtasks
//   - coder:    writes code for a subtask
//   - reviewer: reviews code for bugs/style
//   - tester:   writes and runs tests
//   - researcher: searches web/docs for information
//
// The orchestrator coordinates: it assigns subtasks, collects results,
// and resolves conflicts. This is what enables NexusOS to handle
// "build a complete app" instead of just "write a single file".
// ═══════════════════════════════════════════════════════════════════

import { aiService } from '../services/puterService';
import { useOS } from '../store/osStore';
import { eventBus } from './eventBus';
import { kernelLog } from './log';
import { webSearch } from './webSearch';
import { codeExecutor } from './codeExecution';

export type AgentRole = 'planner' | 'coder' | 'reviewer' | 'tester' | 'researcher';

export interface Agent {
  id: string;
  role: AgentRole;
  status: 'idle' | 'thinking' | 'working' | 'done' | 'failed';
  currentTask: string;
  result?: string;
}

export interface SubTask {
  id: string;
  description: string;
  assignedRole: AgentRole;
  status: 'pending' | 'in-progress' | 'done' | 'failed';
  result?: string;
}

export interface OrchestratedTask {
  id: string;
  goal: string;
  subtasks: SubTask[];
  status: 'planning' | 'executing' | 'reviewing' | 'complete' | 'failed';
  result?: string;
}

const ROLE_PROMPTS: Record<AgentRole, string> = {
  planner: `You are a PLANNER agent. Break the given goal into 2-5 concrete subtasks. For each subtask, specify which agent role should handle it: coder, reviewer, tester, or researcher. Output as JSON: {"subtasks": [{"description": "...", "role": "coder"}]}`,

  coder: `You are a CODER agent. Implement the given task. Write clean, production-ready code. Return ONLY the code in a code block, no explanations.`,

  reviewer: `You are a REVIEWER agent. Review the given code for bugs, security issues, and style. List specific issues with line references. If the code is good, say "APPROVED".`,

  tester: `You are a TESTER agent. Write tests for the given code. Return ONLY the test code.`,

  researcher: `You are a RESEARCHER agent. Search for information about the given topic. Use web search. Return a concise summary with key findings and URLs.`,
};

class AgentOrchestrator {
  private agents = new Map<string, Agent>();
  private tasks = new Map<string, OrchestratedTask>();

  /**
   * Orchestrate a complex task by breaking it into subtasks,
   * delegating each to the appropriate agent role, and collecting
   * results.
   */
  async run(goal: string): Promise<string> {
    const taskId = `task-${Date.now()}`;
    kernelLog.info(`[Orchestrator] Starting task: ${goal}`);

    const task: OrchestratedTask = {
      id: taskId,
      goal,
      subtasks: [],
      status: 'planning',
    };
    this.tasks.set(taskId, task);

    // Phase 1: Planning — ask the planner to break down the goal
    const planResult = await this.runAgent('planner', goal);
    let subtasks: SubTask[] = [];

    try {
      const jsonMatch = planResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.subtasks)) {
          subtasks = parsed.subtasks.map((st: any, i: number) => ({
            id: `${taskId}-sub-${i}`,
            description: st.description || '',
            assignedRole: (st.role || 'coder') as AgentRole,
            status: 'pending' as const,
          }));
        }
      }
    } catch {
      // If planning fails, create a single coder task
      subtasks = [{
        id: `${taskId}-sub-0`,
        description: goal,
        assignedRole: 'coder',
        status: 'pending',
      }];
    }

    if (subtasks.length === 0) {
      subtasks = [{
        id: `${taskId}-sub-0`,
        description: goal,
        assignedRole: 'coder',
        status: 'pending',
      }];
    }

    task.subtasks = subtasks;
    task.status = 'executing';
    eventBus.emit('agent:task-updated', task);

    // Phase 2: Execution — run each subtask with its assigned agent
    const results: string[] = [];
    for (const subtask of subtasks) {
      subtask.status = 'in-progress';
      eventBus.emit('agent:task-updated', task);

      const result = await this.runAgent(subtask.assignedRole, subtask.description);
      subtask.result = result;
      subtask.status = 'done';
      results.push(`[${subtask.assignedRole}] ${subtask.description}:\n${result}`);
      eventBus.emit('agent:task-updated', task);
    }

    // Phase 3: Review (if there were code subtasks)
    const hasCode = subtasks.some(st => st.assignedRole === 'coder');
    if (hasCode) {
      task.status = 'reviewing';
      const reviewResult = await this.runAgent('reviewer', results.join('\n\n---\n\n'));
      results.push(`[reviewer] Review:\n${reviewResult}`);
    }

    task.status = 'complete';
    task.result = results.join('\n\n---\n\n');
    eventBus.emit('agent:task-updated', task);

    kernelLog.info(`[Orchestrator] Task complete: ${taskId}`);
    return task.result;
  }

  /**
   * Run a single agent with the given role and task.
   */
  private async runAgent(role: AgentRole, taskDescription: string): Promise<string> {
    const agentId = `agent-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const agent: Agent = {
      id: agentId,
      role,
      status: 'thinking',
      currentTask: taskDescription,
    };
    this.agents.set(agentId, agent);
    eventBus.emit('agent:spawned', agent);

    try {
      const os = useOS.getState();
      const systemPrompt = ROLE_PROMPTS[role];
      let prompt = `${systemPrompt}\n\nTASK: ${taskDescription}`;

      // Researcher gets web search results injected
      if (role === 'researcher') {
        const searchResults = await webSearch.search(taskDescription);
        const formatted = webSearch.formatResults(searchResults);
        prompt = `${prompt}\n\nWEB SEARCH RESULTS:\n${formatted}`;
      }

      agent.status = 'working';
      const result = await aiService.generateOnce(prompt, os.kernelRules, 'chat');
      agent.result = result;
      agent.status = 'done';
      eventBus.emit('agent:completed', agent);
      return result;
    } catch (e: any) {
      agent.status = 'failed';
      agent.result = e.message;
      eventBus.emit('agent:failed', agent);
      return `[Agent ${role} failed: ${e.message}]`;
    }
  }

  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.status === 'thinking' || a.status === 'working');
  }

  getTask(taskId: string): OrchestratedTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): OrchestratedTask[] {
    return Array.from(this.tasks.values());
  }
}

export const agentOrchestrator = new AgentOrchestrator();
