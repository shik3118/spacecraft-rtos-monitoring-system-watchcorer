import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { RtosTask } from '../../../types/rtos';
import { useMissionStore } from '../../../store/missionStore';

interface TaskControlPanelProps {
  tasks: RtosTask[];
  latestTick: number;
}

function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/[^A-Za-z0-9]/g, '')
    .replace(/^([a-z])/, (match) => match.toUpperCase());
}

export function TaskControlPanel({ tasks, latestTick }: TaskControlPanelProps) {
  const upsertRtosTask = useMissionStore((state) => state.upsertRtosTask);
  const removeRtosTask = useMissionStore((state) => state.removeRtosTask);
  const recordRtosTransition = useMissionStore((state) => state.recordRtosTransition);

  const [name, setName] = useState('PayloadFusionTask');
  const [priority, setPriority] = useState(6);
  const [subsystem, setSubsystem] = useState('payload');
  const [deleteTaskId, setDeleteTaskId] = useState<string>('');

  const deletableTasks = useMemo(() => tasks.filter((task) => task.id !== 'task-idle'), [tasks]);

  const createTask = (event: FormEvent) => {
    event.preventDefault();

    const cleaned = sanitizeName(name);
    if (!cleaned) {
      return;
    }

    const now = Date.now();
    const taskId = `task-user-${cleaned.toLowerCase()}-${now.toString(36).slice(-5)}`;

    const task: RtosTask = {
      id: taskId,
      name: cleaned,
      priority: Math.max(0, Math.min(15, Number(priority) || 0)),
      state: 'ready',
      createdAt: now,
      lastTransitionAt: now,
      restartCount: 0,
      stackUsagePct: 24,
      cpuSliceMs: 4,
      subsystem: subsystem.trim() || 'custom'
    };

    upsertRtosTask(task);
    recordRtosTransition({
      id: `manual-create-${taskId}-${now}`,
      taskId,
      taskName: task.name,
      type: 'create',
      fromState: null,
      toState: 'ready',
      timestamp: now,
      schedulerTick: latestTick,
      note: 'Manually created from RTOS visualizer control plane'
    });
  };

  const deleteTask = () => {
    if (!deleteTaskId) {
      return;
    }

    const targetTask = tasks.find((task) => task.id === deleteTaskId);
    if (!targetTask) {
      return;
    }

    const now = Date.now();
    recordRtosTransition({
      id: `manual-delete-${targetTask.id}-${now}`,
      taskId: targetTask.id,
      taskName: targetTask.name,
      type: 'delete',
      fromState: targetTask.state,
      toState: 'deleted',
      timestamp: now,
      schedulerTick: latestTick,
      note: 'Task deleted from RTOS visualizer control plane'
    });

    removeRtosTask(targetTask.id);
    setDeleteTaskId('');
  };

  return (
    <div className="rounded-xl border border-slate-700/55 bg-space-900/55 p-3">
      <h4 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyanpulse/90">Task Create / Delete Control</h4>

      <form onSubmit={createTask} className="grid gap-2 sm:grid-cols-[1.6fr_0.8fr_1fr_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-lg border border-slate-600/70 bg-space-950/65 px-2.5 py-2 text-xs text-slate-100 focus:border-cyanpulse/60 focus:outline-none"
          placeholder="Task name"
          aria-label="Task name"
        />
        <input
          value={priority}
          onChange={(event) => setPriority(Number(event.target.value))}
          type="number"
          min={0}
          max={15}
          className="rounded-lg border border-slate-600/70 bg-space-950/65 px-2.5 py-2 text-xs text-slate-100 focus:border-cyanpulse/60 focus:outline-none"
          placeholder="Priority"
          aria-label="Task priority"
        />
        <input
          value={subsystem}
          onChange={(event) => setSubsystem(event.target.value)}
          className="rounded-lg border border-slate-600/70 bg-space-950/65 px-2.5 py-2 text-xs text-slate-100 focus:border-cyanpulse/60 focus:outline-none"
          placeholder="Subsystem"
          aria-label="Task subsystem"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-cyan-400/45 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300"
        >
          <Plus className="h-3.5 w-3.5" /> Create
        </button>
      </form>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <select
          value={deleteTaskId}
          onChange={(event) => setDeleteTaskId(event.target.value)}
          className="rounded-lg border border-slate-600/70 bg-space-950/65 px-2.5 py-2 text-xs text-slate-100 focus:border-rose-400/60 focus:outline-none"
          aria-label="Delete task"
        >
          <option value="">Select task for deletion...</option>
          {deletableTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.name} (P{task.priority})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={deleteTask}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-400/45 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 hover:border-rose-300 disabled:opacity-40"
          disabled={!deleteTaskId}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}
