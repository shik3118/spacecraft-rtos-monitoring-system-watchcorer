import { AnimatePresence, motion } from 'framer-motion';
import { Activity, PauseCircle, PlayCircle, RefreshCw, TimerOff } from 'lucide-react';
import type { RtosTask } from '../../../types/rtos';
import { STATE_META, STATE_ORDER, groupTasksByState } from './utils/rtosViewModel';

interface TaskStateCanvasProps {
  tasks: RtosTask[];
  runningTaskId: string | null;
  recentlyRestartedTaskIds: string[];
}

function stateIcon(state: RtosTask['state']) {
  switch (state) {
    case 'running':
      return PlayCircle;
    case 'blocked':
      return TimerOff;
    case 'suspended':
      return PauseCircle;
    case 'restarting':
      return RefreshCw;
    default:
      return Activity;
  }
}

export function TaskStateCanvas({ tasks, runningTaskId, recentlyRestartedTaskIds }: TaskStateCanvasProps) {
  const grouped = groupTasksByState(tasks);

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {STATE_ORDER.map((state) => {
        const stateTasks = grouped[state];
        const meta = STATE_META[state];

        return (
          <div key={state} className={`rounded-xl border bg-space-900/55 p-3 ${meta.borderClass}`}>
            <div className="mb-3 flex items-center justify-between">
              <p className={`text-[0.63rem] uppercase tracking-[0.2em] ${meta.textClass}`}>{meta.label}</p>
              <span className="rounded-md border border-slate-600/70 px-2 py-0.5 text-xs text-slate-300">{stateTasks.length}</span>
            </div>

            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {stateTasks.map((task) => {
                  const Icon = stateIcon(state);
                  const isRunning = task.id === runningTaskId;
                  const isRestarting = recentlyRestartedTaskIds.includes(task.id) || task.state === 'restarting';

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.82, y: 10 }}
                      animate={{
                        opacity: 1,
                        scale: isRunning ? 1.04 : 1,
                        y: 0,
                        boxShadow: isRunning
                          ? '0 0 0 1px rgba(74,222,128,0.35), 0 0 24px rgba(74,222,128,0.28)'
                          : isRestarting
                            ? '0 0 0 1px rgba(167,139,250,0.28), 0 0 20px rgba(167,139,250,0.24)'
                            : '0 0 0 rgba(0,0,0,0)'
                      }}
                      exit={{ opacity: 0, scale: 0.72, x: -8 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 22, mass: 0.7 }}
                      className={`relative overflow-hidden rounded-lg border border-slate-700/60 bg-space-950/55 p-2 rtos-task-node ${
                        isRunning ? 'rtos-running-node' : ''
                      } ${isRestarting ? 'rtos-restarting-node' : ''}`}
                    >
                      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: meta.accent }} />
                      <div className="ml-1.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs text-slate-100">{task.name}</p>
                          <p className="mt-0.5 text-[0.63rem] text-slate-400">P{task.priority} · {task.subsystem}</p>
                        </div>
                        <motion.div
                          animate={{ rotate: task.state === 'restarting' ? 360 : 0 }}
                          transition={{ duration: 1.2, repeat: task.state === 'restarting' ? Infinity : 0, ease: 'linear' }}
                        >
                          <Icon className={`h-3.5 w-3.5 ${meta.textClass}`} />
                        </motion.div>
                      </div>
                      <div className="ml-1.5 mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>CPU {task.cpuSliceMs}ms</span>
                        <span className="h-1 w-1 rounded-full bg-slate-500" />
                        <span>Stack {task.stackUsagePct}%</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
