import { motion } from 'framer-motion';
import type { RtosTask } from '../../../types/rtos';
import { STATE_META, buildPriorityVisualization } from './utils/rtosViewModel';

interface PrioritySpectrumProps {
  tasks: RtosTask[];
}

export function PrioritySpectrum({ tasks }: PrioritySpectrumProps) {
  const rows = buildPriorityVisualization(tasks);

  return (
    <div className="rounded-xl border border-slate-700/55 bg-space-900/55 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs uppercase tracking-[0.2em] text-cyanpulse/90">Priority Visualization</h4>
        <span className="text-[0.65rem] text-slate-400">Priority-weighted scheduling pressure</span>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => {
          const meta = STATE_META[row.state];
          return (
            <div key={row.id} className="rounded-lg border border-slate-700/60 bg-space-950/60 p-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-slate-100">{row.taskName}</p>
                <div className="flex items-center gap-2 text-[0.63rem] uppercase tracking-[0.16em]">
                  <span className="text-slate-400">P{row.priority}</span>
                  <span style={{ color: meta.accent }}>{meta.label}</span>
                </div>
              </div>

              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(8, row.normalizedPriority * 100)}%` }}
                  transition={{ duration: 0.6, delay: index * 0.05, ease: 'easeOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${meta.accent}33, ${meta.accent})` }}
                />
              </div>

              <div className="mt-1.5 flex flex-wrap gap-3 text-[0.62rem] text-slate-400">
                <span>CPU slice {row.cpuSliceMs} ms</span>
                <span>Stack {row.stackUsagePct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
