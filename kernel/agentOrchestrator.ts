// ═══════════════════════════════════════════════════════════════════
// AGENT ORCHESTRATOR v2 — Multi-agent task delegation
//
// v2 UPGRADES:
//   - Parallel execution: independent subtasks run concurrently
//   - Agent-to-agent messaging via OS::AGENT_MESSAGE
//   - Shared workspace in VFS at /system/.daemon/agents/<taskId>/
//   - 8 agent roles (added architect, debugger, orchestrator)
//   - Dependency graph between subtasks
//   - Researcher gracefully handles web search failures
// ═══════════════════════════════════════════════════════════════════

import { aiService } from '../services/puterService';
import { useOS } from '../store/osStore';
import { eventBus } from './eventBus';
import { kernelLog } from './log';
import { webSearch } from './webSearch';
import { vfs, SYSTEM_VFS_APP_ID } from './fileSystem';

export type AgentRole =
  | 'planner'
  | 'coder'
  | 'reviewer'
  | 'tester'
  | 'researcher'
  | 'architect'
  | 'debugger'
  | 'orchestrator';

export interface Agent {
  id: string;
  role: AgentRole;
  status: 'idle' | 'thinking' | 'working' | 'done' | 'failed';
  currentTask: string;
  result?: string;
  mailbox: AgentMessage[];
  createdAt: number;
  taskId?: string;
}

export interface AgentMessage {
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

export interface SubTask {
  id: string;
  description: string;
  assignedRole: AgentRole;
  status: 'pending' | 'in-progress' | 'done' | 'failed';
  result?: string;
  dependsOn?: string[];
}

export interface OrchestratedTask {
  id: string;
  goal: string;
  subtasks: SubTask[];
  status: 'planning' | 'executing' | 'reviewing' | 'complete' | 'failed';
  result?: string;
  createdAt: number;
  sharedWorkspace: string;
}

const ROLE_PROMPTS: Record<AgentRole, string> = {
  planner: `You are a PLANNER agent. Break the given goal into 2-5 concrete subtasks. For each subtask, specify which agent role should handle it (coder, reviewer, tester, researcher, architect, debugger). If subtasks have dependencies, specify them. Output as JSON: {"subtasks": [{"description": "...", "role": "coder", "dependsOn": ["subtask-id"]}]} Use array indices as IDs (e.g., "0", "1").`,

  coder: `You are a CODER agent. Implement the given task. Write clean, production-ready code. Return ONLY the code in a code block, no explanations. If you need to share artifacts with other agents, write them to the shared workspace using OS::WRITE_FILE.`,

  reviewer: `You are a REVIEWER agent. Review the given code for bugs, security issues, and style. List specific issues with line references. If the code is good, say "APPROVED". Otherwise, list specific actionable fixes.`,

  tester: `You are a TESTER agent. Write tests for the given code. Return ONLY the test code. If tests fail, debug and fix the original code too.`,

  researcher: `You are a RESEARCHER agent. Search for information about the given topic. Use web search. Return a concise summary with key findings and URLs.`,

  architect: `You are an ARCHITECT agent. Design the system structure for the given task. Output a list of files to create, their responsibilities, and key interfaces. Be concrete.`,

  debugger: `You are a DEBUGGER agent. Given code and an error report, find the root cause and provide a fix. Output the corrected code in a code block.`,

  orchestrator: `You are an ORCHESTRATOR agent. The given task is complex. Break it down and delegate to specialist agents (coder, reviewer, tester, researcher). Output your plan as JSON: {"delegations": [{"role": "coder", "task": "..."}]}`,
};

class AgentOrchestrator {
  private agents = new Map<string, Agent>();
  private tasks = new Map<string, OrchestratedTask>();
  private nextAgentId = 0;

  async run(goal: string): Promise<string> {
    const taskId = `task-${Date.now()}`;
    const sharedWorkspace = `/system/.daemon/agents/${taskId}`;
    kernelLog.info(`[Orchestrator] Starting task: ${goal}`);

    try {
      if (!vfs.stat(sharedWorkspace)) {
        vfs.createDirRecursive(sharedWorkspace, SYSTEM_VFS_APP_ID);
      }
    } catch {}

    const task: OrchestratedTask = {
      id: taskId,
      goal,
      subtasks: [],
      status: 'planning',
      createdAt: Date.now(),
      sharedWorkspace,
    };
    this.tasks.set(taskId, task);

    const planResult = await this.runAgent('planner', goal, taskId);
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
            dependsOn: Array.isArray(st.dependsOn)
              ? st.dependsOn.map((idx: any) => `${taskId}-sub-${idx}`)
              : [],
          }));
        }
      }
    } catch {}

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

    await this.executeSubtasks(task);

    const hasCode = subtasks.some(st => st.assignedRole === 'coder' || st.assignedRole === 'architect');
    if (hasCode) {
      task.status = 'reviewing';
      eventBus.emit('agent:task-updated', task);
      const reviewResult = await this.runAgent('reviewer', task.subtasks.map(st => st.result || '').join('\n\n---\n\n'), taskId);
      task.subtasks.push({
        id: `${taskId}-review`,
        description: 'Review all code',
        assignedRole: 'reviewer',
        status: 'done',
        result: reviewResult,
      });
    }

    task.status = 'complete';
    task.result = task.subtasks.map(st => `[${st.assignedRole}] ${st.description}:\n${st.result || '(no result)'}`).join('\n\n---\n\n');
    eventBus.emit('agent:task-updated', task);

    kernelLog.info(`[Orchestrator] Task complete: ${taskId}`);
    return task.result;
  }

  private async executeSubtasks(task: OrchestratedTask): Promise<void> {
    const completed = new Set<string>();
    const failed = new Set<string>();

    while (true) {
      const ready = task.subtasks.filter(st => {
        if (st.status !== 'pending') return false;
        if (!st.dependsOn || st.dependsOn.length === 0) return true;
        return st.dependsOn.every(depId => completed.has(depId));
      });

      if (ready.length === 0) {
        const stillPending = task.subtasks.filter(st => st.status === 'pending');
        if (stillPending.length > 0) {
          for (const st of stillPending) {
            st.status = 'failed';
            st.result = `Blocked by failed dependencies: ${st.dependsOn?.filter(d => failed.has(d)).join(', ')}`;
          }
        }
        break;
      }

      const promises = ready.map(async (subtask) => {
        subtask.status = 'in-progress';
        eventBus.emit('agent:task-updated', task);

        let taskDesc = subtask.description;
        if (subtask.dependsOn && subtask.dependsOn.length > 0) {
          const depResults = subtask.dependsOn
            .map(depId => task.subtasks.find(s => s.id === depId))
            .filter((s): s is SubTask => !!s && !!s.result)
            .map(s => `[Result from ${s.assignedRole}]: ${(s.result || '').slice(0, 1000)}`)
            .join('\n\n');
          if (depResults) {
            taskDesc = `${taskDesc}\n\n--- Dependency results ---\n${depResults}`;
          }
        }

        try {
          const result = await this.runAgent(subtask.assignedRole, taskDesc, task.id, task.sharedWorkspace);
          subtask.result = result;
          subtask.status = 'done';
          completed.add(subtask.id);
        } catch (e: any) {
          subtask.result = e.message;
          subtask.status = 'failed';
          failed.add(subtask.id);
        }
        eventBus.emit('agent:task-updated', task);
      });

      await Promise.all(promises);
    }
  }

  private async runAgent(
    role: AgentRole,
    taskDescription: string,
    taskId?: string,
    sharedWorkspace?: string,
  ): Promise<string> {
    const agentId = `agent-${role}-${++this.nextAgentId}-${Date.now().toString(36)}`;
    const agent: Agent = {
      id: agentId,
      role,
      status: 'thinking',
      currentTask: taskDescription,
      mailbox: [],
      createdAt: Date.now(),
      ...(taskId ? { taskId } : {}),
    };
    this.agents.set(agentId, agent);
    eventBus.emit('agent:spawned', agent);

    try {
      const os = useOS.getState();
      const systemPrompt = ROLE_PROMPTS[role];
      let prompt = `${systemPrompt}\n\nTASK: ${taskDescription}`;
      if (sharedWorkspace) {
        prompt += `\n\nSHARED WORKSPACE: ${sharedWorkspace}/ (use OS::WRITE_FILE to share artifacts with other agents)`;
      }

      if (agent.mailbox.length > 0) {
        const msgs = agent.mailbox.map(m => `[From ${m.from}]: ${m.content}`).join('\n');
        prompt += `\n\nMESSAGES FROM OTHER AGENTS:\n${msgs}`;
        agent.mailbox = [];
      }

      if (role === 'researcher') {
        try {
          const searchResults = await webSearch.search(taskDescription);
          const formatted = webSearch.formatResults(searchResults);
          prompt = `${prompt}\n\nWEB SEARCH RESULTS:\n${formatted}`;
        } catch (e: any) {
          kernelLog.warn('[Orchestrator] Web search failed:', e?.message);
        }
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

  sendMessage(fromId: string, toId: string, content: string): boolean {
    const to = this.agents.get(toId);
    if (!to) return false;
    const msg: AgentMessage = {
      from: fromId,
      to: toId,
      content,
      timestamp: Date.now(),
    };
    to.mailbox.push(msg);
    eventBus.emit('agent:message', msg);
    return true;
  }

  async spawn(role: AgentRole, goal: string): Promise<string> {
    const newAgent: Agent = {
      id: `agent-${role}-${++this.nextAgentId}-${Date.now().toString(36)}`,
      role,
      status: 'thinking',
      currentTask: goal,
      mailbox: [],
      createdAt: Date.now(),
    };
    this.agents.set(newAgent.id, newAgent);
    eventBus.emit('agent:spawned', newAgent);

    void this.runAgent(role, goal).then(result => {
      newAgent.result = result;
      newAgent.status = 'done';
      eventBus.emit('agent:completed', newAgent);
    }).catch(err => {
      newAgent.status = 'failed';
      newAgent.result = err.message;
      eventBus.emit('agent:failed', newAgent);
    });

    return newAgent.id;
  }

  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.status === 'thinking' || a.status === 'working');
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getTask(taskId: string): OrchestratedTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): OrchestratedTask[] {
    return Array.from(this.tasks.values());
  }
}

export const agentOrchestrator = new AgentOrchestrator();
