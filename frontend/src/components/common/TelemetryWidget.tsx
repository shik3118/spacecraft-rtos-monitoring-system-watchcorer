import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface TelemetryWidgetProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}

export function TelemetryWidget({ label, value, hint, icon: Icon }: TelemetryWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-600/35 bg-space-900/65 p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-cyanpulse" />
      </div>
      <p className="font-mono text-2xl text-slate-50">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </motion.div>
  );
}
