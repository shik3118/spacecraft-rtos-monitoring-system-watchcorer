import { useEffect, useRef } from 'react';
import { useMissionStore } from '../store/missionStore';
import type { RtosSchedulerFrame, RtosTask, RtosTaskState, RtosTaskTransition } from '../types/rtos';

const BASE_TASKS: Array<Pick<RtosTask, 'id' | 'name' | 'priority' | 'subsystem'>> = [
  { id: 'task-idle', name: 'IdleTask', priority: 0, subsystem: 'system' },
  { id: 'task-telemetry', name: 'TelemetryTask', priority: 5, subsystem: 'communication' },
  { id: 'task-cpu-monitor', name: 'CpuMonitorTask', priority: 6, subsystem: 'cpu' },
  { id: 'task-heap-stack', name: 'HeapStackMonitorTask', priority: 6, subsystem: 'heap_stack' },
  { id: 'task-sensor-health', name: 'SensorHealthTask', priority: 7, subsystem: 'sensor_health' },
  { id: 'task-comm-monitor', name: 'CommunicationMonitorTask', priority: 7, subsystem: 'communication' },
  { id: 'task-watchdog', name: 'WatchdogSupervisorTask', priority: 8, subsystem: 'watchdog' }
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildTask(base: Pick<RtosTask, 'id' | 'name' | 'priority' | 'subsystem'>, now: number): RtosTask {
  return {
    ...base,
    state: base.id === 'task-idle' ? 'ready' : 'running',
    createdAt: now,
    lastTransitionAt: now,
    restartCount: 0,
    stackUsagePct: randomInt(28, 62),
    cpuSliceMs: randomInt(2, 18)
  };
}

function transition(task: RtosTask, toState: RtosTaskState, tick: number, note: string): RtosTaskTransition {
  return {
    id: `tr-${task.id}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    taskId: task.id,
    taskName: task.name,
    type: toState === 'restarting' ? 'restart' : 'state_change',
    fromState: task.state,
    toState,
    timestamp: Date.now(),
    schedulerTick: tick,
    note
  };
}

function chooseWeightedState(taskId: string): RtosTaskState {
  if (taskId === 'task-idle') {
    return 'ready';
  }

  const value = Math.random();
  if (value < 0.54) return 'ready';
  if (value < 0.78) return 'running';
  if (value < 0.92) return 'blocked';
  return 'suspended';
}

export function useRtosTaskSimulation(): void {
  const simulationEnabled = useMissionStore((state) => state.simulationEnabled);
  const initializedRef = useRef(false);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!simulationEnabled) {
      return;
    }

    const store = useMissionStore.getState();
    if (!initializedRef.current && Object.keys(store.rtosTasks).length === 0) {
      const now = Date.now();
      const initialTasks = BASE_TASKS.map((task) => buildTask(task, now));
      store.replaceRtosTasks(initialTasks);

      initialTasks.forEach((task) => {
        const createdTransition: RtosTaskTransition = {
          id: `create-${task.id}-${now}`,
          taskId: task.id,
          taskName: task.name,
          type: 'create',
          fromState: null,
          toState: task.state,
          timestamp: now,
          schedulerTick: tickRef.current,
          note: 'Task created during scheduler boot sequence'
        };
        store.recordRtosTransition(createdTransition);
      });

      initializedRef.current = true;
    }

    const interval = window.setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const now = Date.now();
      const currentStore = useMissionStore.getState();
      const tasks = Object.values(currentStore.rtosTasks);

      if (tasks.length === 0) {
        return;
      }

      const updatedTasks: RtosTask[] = [];
      const transitions: RtosTaskTransition[] = [];
      const restartCandidates: string[] = [];

      let emergencyTaskAdded = false;
      if (!tasks.some((task) => task.id.startsWith('task-emergency')) && Math.random() < 0.09) {
        const emergencyTask: RtosTask = {
          id: `task-emergency-${tick}`,
          name: 'RadiationEmergencyTask',
          priority: 10,
          subsystem: 'thermal',
          state: 'ready',
          createdAt: now,
          lastTransitionAt: now,
          restartCount: 0,
          stackUsagePct: randomInt(34, 72),
          cpuSliceMs: randomInt(6, 20)
        };

        updatedTasks.push(emergencyTask);
        transitions.push({
          id: `create-${emergencyTask.id}-${now}`,
          taskId: emergencyTask.id,
          taskName: emergencyTask.name,
          type: 'create',
          fromState: null,
          toState: 'ready',
          timestamp: now,
          schedulerTick: tick,
          note: 'Dynamic emergency task instantiated by event manager'
        });
        emergencyTaskAdded = true;
      }

      tasks.forEach((task) => {
        if (task.id.startsWith('task-emergency') && !emergencyTaskAdded && Math.random() < 0.1) {
          transitions.push({
            id: `delete-${task.id}-${now}`,
            taskId: task.id,
            taskName: task.name,
            type: 'delete',
            fromState: task.state,
            toState: 'deleted',
            timestamp: now,
            schedulerTick: tick,
            note: 'Emergency task deleted after cooldown and cleanup'
          });
          return;
        }

        const nextState = chooseWeightedState(task.id);
        let revisedTask: RtosTask = {
          ...task,
          state: nextState,
          cpuSliceMs: randomInt(2, 22),
          stackUsagePct: Math.max(8, Math.min(94, task.stackUsagePct + randomInt(-7, 6)))
        };

        if (Math.random() < 0.06 && task.id !== 'task-idle') {
          restartCandidates.push(task.id);
          revisedTask = {
            ...revisedTask,
            state: 'restarting',
            restartCount: task.restartCount + 1,
            lastTransitionAt: now
          };
          transitions.push(transition(task, 'restarting', tick, 'Watchdog restart invoked due heartbeat timeout'));
        } else if (task.state !== nextState) {
          revisedTask = {
            ...revisedTask,
            lastTransitionAt: now
          };
          transitions.push(transition(task, nextState, tick, 'Scheduler state transition'));
        }

        updatedTasks.push(revisedTask);
      });

      const prioritized = [...updatedTasks]
        .filter((task) => task.state !== 'deleted')
        .sort((a, b) => b.priority - a.priority);

      const running = prioritized.find((task) => task.state === 'running') ?? prioritized.find((task) => task.state === 'ready') ?? null;
      const finalTasks: RtosTask[] = updatedTasks.map((task): RtosTask => {
        if (!running || task.id === running.id || task.state === 'deleted') {
          return task;
        }

        if (task.state === 'running') {
          return {
            ...task,
            state: 'ready',
            lastTransitionAt: now
          };
        }

        return task;
      });

      if (running && running.state !== 'running') {
        const runningIndex = finalTasks.findIndex((task) => task.id === running.id);
        if (runningIndex >= 0) {
          finalTasks[runningIndex] = {
            ...finalTasks[runningIndex],
            state: 'running',
            lastTransitionAt: now
          };
          transitions.push({
            id: `schedule-${running.id}-${now}`,
            taskId: running.id,
            taskName: running.name,
            type: 'schedule',
            fromState: running.state,
            toState: 'running',
            timestamp: now,
            schedulerTick: tick,
            note: 'Selected by priority preemptive scheduler'
          });
        }
      }

      currentStore.replaceRtosTasks(finalTasks);
      transitions.forEach((item) => currentStore.recordRtosTransition(item));

      const frame: RtosSchedulerFrame = {
        tick,
        runningTaskId: finalTasks.find((task) => task.state === 'running')?.id ?? null,
        readyQueue: finalTasks
          .filter((task) => task.state === 'ready')
          .sort((a, b) => b.priority - a.priority)
          .map((task) => task.id),
        blockedQueue: finalTasks.filter((task) => task.state === 'blocked').map((task) => task.id),
        suspendedQueue: finalTasks.filter((task) => task.state === 'suspended').map((task) => task.id),
        restartedTaskIds: restartCandidates
      };

      currentStore.ingestSchedulerFrame(frame);
    }, 900);

    return () => {
      window.clearInterval(interval);
    };
  }, [simulationEnabled]);
}
