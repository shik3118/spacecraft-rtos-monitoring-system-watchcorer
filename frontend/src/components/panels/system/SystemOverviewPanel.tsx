import { Cpu, ShieldCheck, Timer, Waves } from 'lucide-react';
import { GlassCard } from '../../common/GlassCard';
import { TelemetryWidget } from '../../common/TelemetryWidget';
import { CircularGauge } from '../../charts/CircularGauge';
import { useMissionStore } from '../../../store/missionStore';

export function SystemOverviewPanel() {
  const latestPacket = useMissionStore((state) => state.latestPacket);
  const ingestCount = useMissionStore((state) => state.ingestCount);
  const parseErrorCount = useMissionStore((state) => state.parseErrorCount);
  const mode = useMissionStore((state) => state.mode);

  const core = Number(latestPacket?.metrics.primary ?? 48);
  const signal = Number(latestPacket?.metrics.signal ?? 95);

  return (
    <GlassCard className="relative overflow-hidden scanline-overlay">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.18em] text-cyanpulse/85">System Overview</h3>
        <p className="text-xs text-slate-400">Real-time mission state</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <TelemetryWidget label="Mission Mode" value={mode.toUpperCase()} icon={ShieldCheck} />
        <TelemetryWidget label="Packets" value={String(ingestCount)} icon={Timer} hint="Ingested packets" />
        <TelemetryWidget label="Parse Errors" value={String(parseErrorCount)} icon={Waves} />
        <TelemetryWidget
          label="Primary Subsystem"
          value={latestPacket?.subsystem.toUpperCase() ?? 'IDLE'}
          icon={Cpu}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700/45 bg-space-900/55 p-4">
          <CircularGauge label="Core Utilization" value={core} />
        </div>
        <div className="rounded-xl border border-slate-700/45 bg-space-900/55 p-4">
          <CircularGauge label="Comms Signal" value={signal} />
        </div>
      </div>
    </GlassCard>
  );
}
