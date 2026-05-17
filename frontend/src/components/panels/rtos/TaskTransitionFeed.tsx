import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, PlusCircle, RefreshCcw, Trash2 } from 'lucide-react';
import type { RtosTaskTransition } from '../../../types/rtos';
import { STATE_META } from './utils/rtosViewModel';

interface TaskTransitionFeedProps {
  transitions: RtosTaskTransition[];
}

function transitionIcon(type: RtosTaskTransition['type']) {
  if (type === 'create') return PlusCircle;
  if (type === 'delete') return Trash2;
  if (type === 'restart') return RefreshCcw;
  return ArrowRight;
}

export function TaskTransitionFeed({ transitions }: TaskTransitionFeedProps) {
  return (
    <div className="rounded-xl border border-slate-700/55 bg-space-900/55 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs uppercase tracking-[0.2em] text-cyanpulse/90">Lifecycle Event Feed</h4>
        <span className="text-[0.65rem] text-slate-400">Latest {Math.min(transitions.length, 12)} transitions</span>
      </div>

      <div className="max-h-64 space-y-2 overflow-auto pr-1">
        <AnimatePresence initial={false}>
          {transitions.slice(0, 12).map((transition, index) => {
            const Icon = transitionIcon(transition.type);
            const toMeta = STATE_META[transition.toState];
            const fromMeta = transition.fromState ? STATE_META[transition.fromState] : null;

            return (
              <motion.div
                key={transition.id}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25, delay: index * 0.02 }}
                className="rounded-lg border border-slate-700/70 bg-space-950/60 px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-100">{transition.taskName}</p>
                    <p className="text-[0.63rem] text-slate-400">Tick {transition.schedulerTick} · {transition.note}</p>
                  </div>
                  <Icon className="mt-0.5 h-3.5 w-3.5 text-slate-300" />
                </div>

                <div className="mt-1.5 flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.16em]">
                  <span className={fromMeta ? '' : 'text-slate-500'} style={fromMeta ? { color: fromMeta.accent } : undefined}>
                    {fromMeta?.label ?? 'none'}
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span style={{ color: toMeta.accent }}>{toMeta.label}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
