import React, { useState, useEffect } from 'react';
import { Layout, Plus, Trash2, GripVertical, CheckCircle, Circle, Clock } from 'lucide-react';
import { uuid } from '../utils/uuid';

interface Task { id: string; title: string; created: number; }
interface Column { id: string; title: string; tasks: Task[]; color: string; }
const LS_KEY = 'nexus_kanban';
const COLORS = ['border-violet-500', 'border-amber-500', 'border-emerald-500', 'border-cyan-500', 'border-red-500'];

export default function KanbanApp() {
  const [columns, setColumns] = useState<Column[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || getDefault(); } catch { return getDefault(); }
  });

  function getDefault(): Column[] {
    return [
      { id: '1', title: 'To Do', tasks: [], color: COLORS[0] },
      { id: '2', title: 'In Progress', tasks: [], color: COLORS[1] },
      { id: '3', title: 'Done', tasks: [], color: COLORS[2] },
    ];
  }

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(columns)); }, [columns]);

  const addTask = (colId: string) => {
    const title = prompt('Task title:');
    if (!title) return;
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, tasks: [...c.tasks, { id: uuid(), title, created: Date.now() }] } : c));
  };

  const removeTask = (colId: string, taskId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) } : c));
  };

  const moveTask = (fromCol: string, taskId: string, direction: 1 | -1) => {
    const fromIdx = columns.findIndex(c => c.id === fromCol);
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= columns.length) return;
    const task = columns[fromIdx].tasks.find(t => t.id === taskId);
    if (!task) return;
    setColumns(prev => prev.map((c, i) => {
      if (i === fromIdx) return { ...c, tasks: c.tasks.filter(t => t.id !== taskId) };
      if (i === toIdx) return { ...c, tasks: [...c.tasks, task] };
      return c;
    }));
  };

  const addColumn = () => {
    const title = prompt('Column name:');
    if (!title) return;
    setColumns(prev => [...prev, { id: uuid(), title, tasks: [], color: COLORS[prev.length % COLORS.length] }]);
  };

  const removeColumn = (colId: string) => {
    if (!confirm('Delete this column and all its tasks?')) return;
    setColumns(prev => prev.filter(c => c.id !== colId));
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100">
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <Layout size={16} className="text-violet-400" />
          <span className="font-bold text-sm tracking-widest uppercase">Kanban Board</span>
        </div>
        <button onClick={addColumn} className="flex items-center gap-1 px-3 py-1 bg-violet-500/20 text-violet-400 rounded-lg text-xs hover:bg-violet-500/30 transition">
          <Plus size={12} /> Column
        </button>
      </div>
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {columns.map((col, colIdx) => (
          <div key={col.id} className={`w-64 shrink-0 bg-zinc-900/50 rounded-xl border-t-2 ${col.color} flex flex-col`}>
            <div className="px-3 py-2 flex items-center justify-between border-b border-white/5">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{col.title}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 rounded">{col.tasks.length}</span>
                <button onClick={() => removeColumn(col.id)} className="p-0.5 text-zinc-600 hover:text-red-400 transition"><Trash2 size={10} /></button>
              </div>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {col.tasks.map(task => (
                <div key={task.id} className="bg-zinc-800/80 rounded-lg p-2.5 border border-white/5 hover:border-white/10 transition group">
                  <div className="text-xs text-white mb-1">{task.title}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] text-zinc-600">
                      <Clock size={8} /> {new Date(task.created).toLocaleDateString()}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      {colIdx > 0 && <button onClick={() => moveTask(col.id, task.id, -1)} className="text-[10px] text-zinc-500 hover:text-white px-1">←</button>}
                      {colIdx < columns.length - 1 && <button onClick={() => moveTask(col.id, task.id, 1)} className="text-[10px] text-zinc-500 hover:text-white px-1">→</button>}
                      <button onClick={() => removeTask(col.id, task.id)} className="text-[10px] text-red-500/50 hover:text-red-400 px-1">×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => addTask(col.id)} className="mx-2 mb-2 py-1.5 text-xs text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition flex items-center justify-center gap-1">
              <Plus size={12} /> Add Task
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
