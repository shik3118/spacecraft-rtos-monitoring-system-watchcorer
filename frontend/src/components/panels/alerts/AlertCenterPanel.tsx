import { motion } from 'framer-motion';
import { BellRing } from 'lucide-react';
import { GlassCard } from '../../common/GlassCard';
import { useMissionStore } from '../../../store/missionStore';
import { severityClass, subsystemToLabel } from '../../../utils/theme';

export function AlertCenterPanel() {
  const alerts = useMissionStore((state) => state.alerts);
  const acknowledgeAlert = useMissionStore((state) => state.acknowledgeAlert);

  return (
    <GlassCard className="h-full">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.18em] text-cyanpulse/85">Alert Center</h3>
        <span className="inline-flex items-center gap-2 text-xs text-slate-400">
          <BellRing className="h-4 w-4 text-cyanpulse" />
          {alerts.length} active
        </span>
      </div>

      <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
        {alerts.length === 0 ? (
          <p className="rounded-xl border border-slate-700/45 bg-space-900/60 p-4 text-sm text-slate-400">
            No active alerts. All systems in stable operating envelope.
          </p>
        ) : (
          alerts.map((alert) => (
            <motion.article
              key={alert.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-slate-700/45 bg-space-900/65 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[0.62rem] uppercase ${severityClass(alert.severity)}`}>
                  {alert.severity}
                </span>
                <span className="text-xs text-slate-400">{subsystemToLabel(alert.subsystem)}</span>
              </div>
              <p className="text-sm text-slate-200">{alert.message}</p>
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="mt-2 text-xs uppercase tracking-[0.14em] text-cyanpulse/80 hover:text-cyanpulse"
              >
                Acknowledge
              </button>
            </motion.article>
          ))
        )}
      </div>
    </GlassCard>
  );
}
