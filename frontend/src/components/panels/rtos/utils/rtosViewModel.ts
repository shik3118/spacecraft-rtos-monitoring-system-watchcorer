import type { RtosSchedulerFrame, RtosTask, RtosTaskState, RtosTaskTransition } from '../../../../types/rtos';

export interface TaskStateMeta {
  label: string;
  accent: string;
  borderClass: string;
  textClass: string;
}

export interface SchedulerTimelinePoint {
  tick: number;
  running: number;
  ready: number;
  blocked: number;
  suspended: number;
  restarted: number;
}

export interface PriorityVisualizationPoint {
  id: string;
  taskName: string;
  priority: number;
  cpuSliceMs: number;
  stackUsagePct: number;
  normalizedPriority: number;
  state: RtosTaskState;
}

export interface TaskLifecycleSummary {
  created: number;
  deleted: number;
  restarted: number;
  transitions: number;
}

export const STATE_ORDER: RtosTaskState[] = ['running', 'ready', 'blocked', 'suspended', 'restarting'];

export const STATE_META: Record<RtosTaskState, TaskStateMeta> = {
  running: {
    label: 'Running',
    accent: '#4ade80',
    borderClass: 'border-emerald-400/50',
    textClass: 'text-emerald-300'
  },
  ready: {
    label: 'Ready',
    accent: '#43e6ff',
    borderClass: 'border-cyanpulse/45',
    textClass: 'text-cyan-200'
  },
  blocked: {
    label: 'Blocked',
    accent: '#f59e0b',
    borderClass: 'border-amber-400/50',
    textClass: 'text-amber-300'
  },
  suspended: {
    label: 'Suspended',
    accent: '#f43f5e',
    borderClass: 'border-rose-400/50',
    textClass: 'text-rose-300'
  },
  restarting: {
    label: 'Restarting',
    accent: '#a78bfa',
    borderClass: 'border-violet-400/50',
    textClass: 'text-violet-300'
  },
  deleted: {
    label: 'Deleted',
    accent: '#94a3b8',
    borderClass: 'border-slate-500/40',
    textClass: 'text-slate-300'
  }
};

export function groupTasksByState(tasks: RtosTask[]): Record<RtosTaskState, RtosTask[]> {
  const grouped: Record<RtosTaskState, RtosTask[]> = {
    running: [],
    ready: [],
    blocked: [],
    suspended: [],
    restarting: [],
    deleted: []
  };

  tasks.forEach((task) => {
    grouped[task.state].push(task);
  });

  Object.values(grouped).forEach((taskList) => {
    taskList.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
  });

  return grouped;
}

export function buildSchedulerTimeline(frames: RtosSchedulerFrame[]): SchedulerTimelinePoint[] {
  return frames.map((frame) => ({
    tick: frame.tick,
    running: frame.runningTaskId ? 1 : 0,
    ready: frame.readyQueue.length,
    blocked: frame.blockedQueue.length,
    suspended: frame.suspendedQueue.length,
    restarted: frame.restartedTaskIds.length
  }));
}

export function buildPriorityVisualization(tasks: RtosTask[]): PriorityVisualizationPoint[] {
  const maxPriority = tasks.reduce((acc, task) => Math.max(acc, task.priority), 1);

  return [...tasks]
    .sort((a, b) => b.priority - a.priority || b.cpuSliceMs - a.cpuSliceMs)
    .map((task) => ({
      id: task.id,
      taskName: task.name,
      priority: task.priority,
      cpuSliceMs: task.cpuSliceMs,
      stackUsagePct: task.stackUsagePct,
      normalizedPriority: task.priority / Math.max(maxPriority, 1),
      state: task.state
    }));
}

export function summarizeLifecycle(transitions: RtosTaskTransition[]): TaskLifecycleSummary {
  return transitions.reduce<TaskLifecycleSummary>(
    (summary, transition) => {
      if (transition.type === 'create') {
        summary.created += 1;
      }
      if (transition.type === 'delete') {
        summary.deleted += 1;
      }
      if (transition.type === 'restart') {
        summary.restarted += 1;
      }
      if (transition.type === 'state_change' || transition.type === 'schedule') {
        summary.transitions += 1;
      }
      return summary;
    },
    {
      created: 0,
      deleted: 0,
      restarted: 0,
      transitions: 0
    }
  );
}
