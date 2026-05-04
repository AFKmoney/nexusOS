import React, { useState } from 'react';
import { ChevronLeft, Plus, X, Circle, CheckCircle2 } from 'lucide-react';
import type { MobileAppProps } from '../types';

interface Task { id: string; text: string; done: boolean; }
interface Column { id: string; title: string; color: string; tasks: Task[]; }

const initCols: Column[] = [
  { id: 'todo', title: 'To Do', color: '#6366f1', tasks: [
    { id: '1', text: 'Design mobile UI', done: false },
    { id: '2', text: 'Write unit tests', done: false },
  ]},
  { id: 'prog', title: 'In Progress', color: '#f59e0b', tasks: [
    { id: '3', text: 'Build NexusPortable', done: false },
  ]},
  { id: 'done', title: 'Done', color: '#10b981', tasks: [
    { id: '4', text: 'Setup repo', done: true },
    { id: '5', text: 'Write CLAUDE.md', done: true },
  ]},
];

export default function MobileKanban({ onBack }: MobileAppProps) {
  const [cols, setCols] = useState<Column[]>(initCols);
  const [activeCol, setActiveCol] = useState('todo');
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);

  const col = cols.find(c => c.id === activeCol)!;

  const addTask = () => {
    if (!newTask.trim()) return;
    setCols(cs => cs.map(c => c.id === activeCol
      ? { ...c, tasks: [...c.tasks, { id: Date.now().toString(), text: newTask.trim(), done: false }] }
      : c
    ));
    setNewTask('');
    setAdding(false);
  };

  const toggleTask = (colId: string, taskId: string) => {
    setCols(cs => cs.map(c => c.id === colId
      ? { ...c, tasks: c.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) }
      : c
    ));
  };

  const removeTask = (colId: string, taskId: string) => {
    setCols(cs => cs.map(c => c.id === colId
      ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) }
      : c
    ));
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--nx-surface)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.9)' }}>
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px] flex-1">Kanban</h1>
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
          onClick={() => setAdding(true)}
        >
          <Plus size={18} className="text-emerald-400" />
        </button>
      </div>

      {/* Column tabs */}
      <div className="flex gap-2 px-4 py-3 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {cols.map(c => (
          <button
            key={c.id}
            className="flex-none flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-all"
            style={{
              background: activeCol === c.id ? c.color + '20' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeCol === c.id ? c.color + '40' : 'rgba(255,255,255,0.07)'}`,
              color: activeCol === c.id ? c.color : 'rgba(255,255,255,0.5)',
            }}
            onClick={() => setActiveCol(c.id)}
          >
            {c.title}
            <span className="text-[11px] px-1.5 py-0.5 rounded-full"
              style={{ background: c.color + '30' }}>
              {c.tasks.length}
            </span>
          </button>
        ))}
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {adding && (
          <div className="flex items-center gap-2 p-3 rounded-2xl"
            style={{ background: `${col.color}10`, border: `1px solid ${col.color}30` }}>
            <input
              className="flex-1 bg-transparent text-white text-[14px] outline-none"
              placeholder="New task..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              autoFocus
              style={{ fontSize: '16px', userSelect: 'text', WebkitUserSelect: 'text' }}
            />
            <button className="px-3 py-1.5 rounded-xl text-[13px] font-medium text-black"
              style={{ background: col.color }} onClick={addTask}>Add</button>
            <button onClick={() => setAdding(false)}>
              <X size={16} className="text-white/40" />
            </button>
          </div>
        )}
        {col.tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{
              background: task.done ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.06)',
              opacity: task.done ? 0.6 : 1,
            }}
          >
            <button onClick={() => toggleTask(col.id, task.id)}>
              {task.done
                ? <CheckCircle2 size={20} style={{ color: col.color }} />
                : <Circle size={20} className="text-white/30" />
              }
            </button>
            <p className={`flex-1 text-[14px] ${task.done ? 'line-through text-white/40' : 'text-white'}`}>
              {task.text}
            </p>
            <button className="p-1 active:opacity-60" onClick={() => removeTask(col.id, task.id)}>
              <X size={14} className="text-white/30" />
            </button>
          </div>
        ))}
        {col.tasks.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center py-12 text-white/20 gap-2">
            <p className="text-[14px]">No tasks in {col.title}</p>
          </div>
        )}
      </div>
    </div>
  );
}
