import React, { useState, useEffect } from 'react';
import { Layout, Plus, Trash2, Clock, MoreVertical, CheckCircle2 } from 'lucide-react';
import { uuid } from '../utils/uuid';
import { useOS } from '../store/osStore';

interface Task { id: string; title: string; created: number; tags: string[]; }
interface Column { id: string; title: string; tasks: Task[]; color: string; }
const LS_KEY = 'nexus_kanban_v2';

const COLUMN_COLORS = [
  'border-emerald-500', 
  'border-blue-500', 
  'border-violet-500', 
  'border-amber-500', 
  'border-rose-500'
];

export default function KanbanApp() {
  const { addNotification } = useOS();
  const [columns, setColumns] = useState<Column[]>(() => {
    try { 
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'todo', title: 'To Do', tasks: [], color: COLUMN_COLORS[0] },
      { id: 'progress', title: 'In Progress', tasks: [], color: COLUMN_COLORS[1] },
      { id: 'done', title: 'Completed', tasks: [], color: COLUMN_COLORS[2] },
    ];
  });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(columns));
  }, [columns]);

  const addTask = (e: React.FormEvent, colId: string) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    setColumns(prev => prev.map(c => {
      if (c.id === colId) {
        return { 
          ...c, 
          tasks: [...c.tasks, { id: uuid(), title: newTaskTitle, created: Date.now(), tags: [] }] 
        };
      }
      return c;
    }));
    setNewTaskTitle('');
    setActiveColumnId(null);
  };

  const removeTask = (colId: string, taskId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) } : c));
  };

  const moveTask = (fromColId: string, taskId: string, direction: 1 | -1) => {
    const fromIdx = columns.findIndex(c => c.id === fromColId);
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= columns.length) return;
    
    const task = columns[fromIdx].tasks.find(t => t.id === taskId);
    if (!task) return;

    setColumns(prev => {
      const newCols = [...prev];
      newCols[fromIdx] = { ...newCols[fromIdx], tasks: newCols[fromIdx].tasks.filter(t => t.id !== taskId) };
      newCols[toIdx] = { ...newCols[toIdx], tasks: [...newCols[toIdx].tasks, task] };
      return newCols;
    });
  };

  const addColumn = () => {
    const title = prompt('Enter column name:');
    if (!title?.trim()) return;
    const color = COLUMN_COLORS[columns.length % COLUMN_COLORS.length];
    setColumns(prev => [...prev, { id: uuid(), title, tasks: [], color }]);
  };

  const removeColumn = (colId: string) => {
    if (!confirm('Are you sure you want to delete this column and all its tasks?')) return;
    setColumns(prev => prev.filter(c => c.id !== colId));
  };

  const purgeBoard = () => {
    if (!confirm('Purge ALL tasks and columns? This cannot be undone.')) return;
    setColumns([
      { id: 'todo', title: 'To Do', tasks: [], color: COLUMN_COLORS[0] },
      { id: 'progress', title: 'In Progress', tasks: [], color: COLUMN_COLORS[1] },
      { id: 'done', title: 'Completed', tasks: [], color: COLUMN_COLORS[2] },
    ]);
    addNotification({ title: 'Board Purged', message: 'Kanban board has been reset.', type: 'info' });
  };

  return (
    <div className="h-full flex flex-col bg-[#050508] text-zinc-100 font-sans overflow-hidden relative">
      
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-violet-900/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-xl shrink-0 z-10 relative">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-violet-500/20 rounded-xl">
            <Layout size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-[0.2em] text-white">Project Matrix</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Neural Workflow Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={purgeBoard} className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
            Purge Board
          </button>
          <button onClick={addColumn} className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95">
            <Plus size={14} /> New Column
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex gap-6 p-6 overflow-x-auto overflow-y-hidden custom-scrollbar relative z-10">
        {columns.map((col, colIdx) => (
          <div key={col.id} className="w-80 shrink-0 flex flex-col max-h-full">
            
            {/* Column Header */}
            <div className={`p-4 bg-zinc-900/80 backdrop-blur-md rounded-t-2xl border-t-4 border-x border-white/5 ${col.color} flex items-center justify-between shrink-0 shadow-lg`}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-white uppercase tracking-wider drop-shadow-md">{col.title}</span>
                <span className="text-[10px] font-mono font-bold text-black bg-white/80 px-2 py-0.5 rounded-full">{col.tasks.length}</span>
              </div>
              <button onClick={() => removeColumn(col.id)} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete Column">
                <Trash2 size={14} />
              </button>
            </div>

            {/* Tasks Area */}
            <div className="flex-1 bg-black/40 border-x border-b border-white/5 rounded-b-2xl p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              
              {col.tasks.map(task => (
                <div key={task.id} className="bg-zinc-900 border border-white/10 hover:border-violet-500/50 rounded-xl p-4 transition-all group shadow-sm hover:shadow-[0_5px_15px_rgba(139,92,246,0.15)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-violet-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="text-sm text-zinc-200 font-medium leading-snug mb-3 pr-6 break-words">{task.title}</div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 bg-black/40 px-2 py-1 rounded-md">
                      <Clock size={10} /> {new Date(task.created).toLocaleDateString()}
                    </div>
                    
                    {/* Controls (visible on hover) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 border border-white/10 p-1 rounded-lg absolute bottom-3 right-3 shadow-lg">
                      <button onClick={() => moveTask(col.id, task.id, -1)} disabled={colIdx === 0} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 transition-all">←</button>
                      <button onClick={() => moveTask(col.id, task.id, 1)} disabled={colIdx === columns.length - 1} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 transition-all">→</button>
                      <div className="w-px h-3 bg-white/10 mx-1" />
                      <button onClick={() => removeTask(col.id, task.id)} className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded transition-all"><CheckCircle2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Task Input */}
              {activeColumnId === col.id ? (
                <form onSubmit={(e) => addTask(e, col.id)} className="mt-2">
                  <textarea 
                    autoFocus
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask(e as any, col.id); } }}
                    placeholder="Enter task directive..."
                    className="w-full bg-black/60 border border-violet-500/50 rounded-xl p-3 text-sm text-white outline-none resize-none min-h-[80px] shadow-inner font-sans"
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="submit" disabled={!newTaskTitle.trim()} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors">Add</button>
                    <button type="button" onClick={() => { setActiveColumnId(null); setNewTaskTitle(''); }} className="px-4 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"><Trash2 size={14}/></button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setActiveColumnId(col.id)} 
                  className="mt-2 w-full py-3 border border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/10 rounded-xl text-xs font-bold text-zinc-500 hover:text-violet-400 uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add Directive
                </button>
              )}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
