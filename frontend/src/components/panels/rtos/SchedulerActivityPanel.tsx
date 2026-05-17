import { motion } from 'framer-motion';
import { Cpu, GitBranch, RefreshCcw, Trash2 } from 'lucide-react';
import type { RtosSchedulerFrame, RtosTask, RtosTaskTransition } from '../../../types/rtos';
import { STATE_META, summarizeLifecycle } from './utils/rtosViewModel';

interface SchedulerActivityPanelProps {
  tasks: RtosTask[];
  latestFrame: RtosSchedulerFrame | null;
  transitions: RtosTaskTransition[];
}

function taskName(tasks: RtosTask[], id: string | null): string {
  if (!id) return 'None';
  return tasks.find((task) => task.id === id)?.name ?? id;
}

export function SchedulerActivityPanel({ tasks, latestFrame, transitions }: SchedulerActivityPanelProps) {
  const summary = summarizeLifecycle(transitions);

  return (
    <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-xl border border-slate-700/55 bg-space-900/55 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-[0.2em] text-cyanpulse/90">Scheduler Activity</h4>
          <span className="text-xs text-slate-400">Tick {latestFrame?.tick ?? 0}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-2">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-emerald-300">Running</p>
            <p className="mt-1 truncate font-mono text-xs text-slate-100">{taskName(tasks, latestFrame?.runningTaskId ?? null)}</p>
          </div>
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-2">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-amber-300">Blocked Queue</p>
            <p className="mt-1 font-mono text-xs text-slate-100">{latestFrame?.blockedQueue.length ?? 0}</p>
          </div>
          <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-2">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-rose-300">Suspended Queue</p>
            <p className="mt-1 font-mono text-xs text-slate-100">{latestFrame?.suspendedQueue.length ?? 0}</p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-700/60 bg-space-950/60 p-2.5">
          <p className="mb-2 text-[0.62rem] uppercase tracking-[0.18em] text-slate-300">State Transition Indicators</p>
          <div className="space-y-1.5">
            {transitions.slice(0, 5).map((transition) => {
              const fromMeta = transition.fromState ? STATE_META[transition.fromState] : null;
              const toMeta = STATE_META[transition.toState];

              return (
                <div key={transition.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-800/80 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-200">{transition.taskName}</p>
                    <p className="text-[0.64rem] text-slate-400">{transition.note}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[0.62rem] font-medium">
                    {fromMeta ? <span style={{ color: fromMeta.accent }}>{fromMeta.label}</span> : <span className="text-slate-500">∅</span>}
                    <GitBranch className="h-3 w-3 text-slate-500" />
                    <span style={{ color: toMeta.accent }}>{toMeta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/55 bg-space-900/55 p-3">
        <h4 className="mb-3 text-xs uppercase tracking-[0.2em] text-cyanpulse/90">Task Lifecycle</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 p-2">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-cyan-200">Created</p>
            <p className="mt-1 font-mono text-lg text-cyan-100">{summary.created}</p>
          </div>
          <div className="rounded-lg border border-slate-500/45 bg-slate-500/10 p-2">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-slate-300">Deleted</p>
            <p className="mt-1 font-mono text-lg text-slate-200">{summary.deleted}</p>
          </div>
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-lg border border-violet-400/45 bg-violet-500/10 p-2"
          >
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-violet-200">Restarted</p>
            <p className="mt-1 flex items-center gap-1 font-mono text-lg text-violet-100">
              <RefreshCcw className="h-3.5 w-3.5" />
              {summary.restarted}
            </p>
          </motion.div>
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-2">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-emerald-200">Transitions</p>
            <p className="mt-1 font-mono text-lg text-emerald-100">{summary.transitions}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
          <div className="rounded-md border border-slate-700/65 bg-space-950/60 p-2">
            <Cpu className="mb-1 h-3.5 w-3.5 text-cyanpulse" />
            Active scheduler
          </div>
          <div className="rounded-md border border-slate-700/65 bg-space-950/60 p-2">
            <RefreshCcw className="mb-1 h-3.5 w-3.5 text-violet-300" />
            Watchdog restart
          </div>
          <div className="rounded-md border border-slate-700/65 bg-space-950/60 p-2">
            <Trash2 className="mb-1 h-3.5 w-3.5 text-slate-300" />
            Dynamic deletion
          </div>
        </div>
      </div>
    </div>
  );
}
