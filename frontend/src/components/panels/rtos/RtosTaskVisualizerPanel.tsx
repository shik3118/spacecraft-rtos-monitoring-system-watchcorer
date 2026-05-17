import { Cpu, PauseCircle, PlayCircle, TimerOff } from 'lucide-react';
import { GlassCard } from '../../common/GlassCard';
import { useMissionStore } from '../../../store/missionStore';
import { PrioritySpectrum } from './PrioritySpectrum';
import { SchedulerActivityPanel } from './SchedulerActivityPanel';
import { SchedulerTimeline } from './SchedulerTimeline';
import { TaskControlPanel } from './TaskControlPanel';
import { TaskStateCanvas } from './TaskStateCanvas';
import { TaskTransitionFeed } from './TaskTransitionFeed';

export function RtosTaskVisualizerPanel() {
  const taskRecord = useMissionStore((state) => state.rtosTasks);
  const schedulerFrames = useMissionStore((state) => state.schedulerFrames);
  const transitions = useMissionStore((state) => state.rtosTransitions);

  const tasks = Object.values(taskRecord)
    .filter((task) => task.state !== 'deleted')
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

  const latestFrame = schedulerFrames.at(-1) ?? null;

  return (
    <GlassCard className="relative overflow-hidden scanline-overlay">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm uppercase tracking-[0.18em] text-cyanpulse/85">RTOS Task Visualizer</h3>
          <p className="text-xs text-slate-400">Task lifecycle, scheduler decisions, and priority dynamics</p>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[0.62rem] uppercase tracking-[0.16em]">
          <span className="glass-chip flex items-center gap-1 border-emerald-400/40 text-emerald-200">
            <PlayCircle className="h-3 w-3" /> running
          </span>
          <span className="glass-chip flex items-center gap-1 border-amber-400/40 text-amber-200">
            <TimerOff className="h-3 w-3" /> blocked
          </span>
          <span className="glass-chip flex items-center gap-1 border-rose-400/40 text-rose-200">
            <PauseCircle className="h-3 w-3" /> suspended
          </span>
          <span className="glass-chip flex items-center gap-1 border-violet-400/40 text-violet-200">
            <Cpu className="h-3 w-3" /> scheduler
          </span>
        </div>
      </div>

      <TaskControlPanel tasks={tasks} latestTick={latestFrame?.tick ?? 0} />

      <div className="mt-4">
        <TaskStateCanvas
          tasks={tasks}
          runningTaskId={latestFrame?.runningTaskId ?? null}
          recentlyRestartedTaskIds={latestFrame?.restartedTaskIds ?? []}
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <SchedulerActivityPanel tasks={tasks} latestFrame={latestFrame} transitions={transitions} />
        <TaskTransitionFeed transitions={transitions} />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <SchedulerTimeline frames={schedulerFrames} />
        <PrioritySpectrum tasks={tasks} />
      </div>
    </GlassCard>
  );
}
