export type RtosTaskState = 'running' | 'ready' | 'blocked' | 'suspended' | 'deleted' | 'restarting';

export type RtosTransitionType = 'create' | 'delete' | 'restart' | 'state_change' | 'schedule';

export interface RtosTask {
  id: string;
  name: string;
  priority: number;
  state: RtosTaskState;
  createdAt: number;
  lastTransitionAt: number;
  restartCount: number;
  stackUsagePct: number;
  cpuSliceMs: number;
  subsystem: string;
}

export interface RtosTaskTransition {
  id: string;
  taskId: string;
  taskName: string;
  type: RtosTransitionType;
  fromState: RtosTaskState | null;
  toState: RtosTaskState;
  timestamp: number;
  schedulerTick: number;
  note: string;
}

export interface RtosSchedulerFrame {
  tick: number;
  runningTaskId: string | null;
  readyQueue: string[];
  blockedQueue: string[];
  suspendedQueue: string[];
  restartedTaskIds: string[];
}
