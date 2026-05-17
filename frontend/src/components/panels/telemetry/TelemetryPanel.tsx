import { useMemo } from 'react';
import { GlassCard } from '../../common/GlassCard';
import { TelemetryAreaChart } from '../../charts/TelemetryAreaChart';
import { TelemetryLineChart } from '../../charts/TelemetryLineChart';
import { useMissionStore } from '../../../store/missionStore';

function stamp(ts: number): string {
  const date = new Date(ts);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;
}

export function TelemetryPanel() {
  const telemetryHistory = useMissionStore((state) => state.telemetryHistory);

  const points = useMemo(
    () =>
      telemetryHistory.slice(-32).map((packet) => ({
        time: stamp(packet.timestamp),
        value: Number(packet.metrics.primary ?? 0)
      })),
    [telemetryHistory]
  );

  const jitterPoints = useMemo(
    () =>
      telemetryHistory.slice(-28).map((packet) => ({
        time: stamp(packet.timestamp),
        value: Number(packet.metrics.jitter ?? 0)
      })),
    [telemetryHistory]
  );

  return (
    <GlassCard className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.18em] text-cyanpulse/85">Telemetry Streams</h3>
        <p className="text-xs text-slate-400">Primary + jitter channels</p>
      </div>

      <TelemetryAreaChart data={points} />
      <TelemetryLineChart data={jitterPoints} color="#4ade80" valueLabel="Jitter" />
    </GlassCard>
  );
}
