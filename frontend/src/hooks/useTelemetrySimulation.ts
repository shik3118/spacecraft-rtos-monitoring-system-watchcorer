import { useEffect } from 'react';
import { useMissionStore } from '../store/missionStore';
import type { SystemMode, TelemetryPacket, TelemetrySeverity, TelemetrySubsystem } from '../types/telemetry';

const subsystems: TelemetrySubsystem[] = [
  'cpu',
  'heap_stack',
  'sensor_health',
  'communication',
  'thermal',
  'power',
  'watchdog'
];

function severityForMetric(value: number): TelemetrySeverity {
  if (value >= 85) return 'critical';
  if (value >= 70) return 'warning';
  return 'nominal';
}

function modeFromSeverity(severity: TelemetrySeverity): SystemMode {
  if (severity === 'critical') return 'safe_mode';
  if (severity === 'warning') return 'degraded';
  return 'nominal';
}

export function useTelemetrySimulation(): void {
  const simulationEnabled = useMissionStore((state) => state.simulationEnabled);
  const isConnected = useMissionStore((state) => state.isConnected);
  const ingestTelemetry = useMissionStore((state) => state.ingestTelemetry);

  useEffect(() => {
    if (!simulationEnabled || isConnected) {
      return;
    }

    const timer = window.setInterval(() => {
      const subsystem = subsystems[Math.floor(Math.random() * subsystems.length)];
      const coreMetric = 35 + Math.random() * 65;
      const severity = severityForMetric(coreMetric);

      const packet: TelemetryPacket = {
        packetId: `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        subsystem,
        severity,
        mode: modeFromSeverity(severity),
        metrics: {
          primary: Number(coreMetric.toFixed(2)),
          jitter: Number((Math.random() * 6).toFixed(2)),
          signal: Number((92 + Math.random() * 8).toFixed(2))
        },
        receivedAt: Date.now(),
        source: 'simulation'
      };

      ingestTelemetry(packet);
    }, 1200);

    return () => window.clearInterval(timer);
  }, [ingestTelemetry, isConnected, simulationEnabled]);
}
