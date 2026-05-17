import { useState } from 'react';
import { AlertOctagon, GaugeCircle, Satellite, Thermometer, Zap } from 'lucide-react';
import { GlassCard } from '../../common/GlassCard';
import {
  sendFaultCommand,
  simulate_battery_drop,
  simulate_comm_loss,
  simulate_emergency_recovery,
  simulate_heap_exhaustion,
  simulate_queue_stress,
  simulate_radiation_spike,
  simulate_task_freeze,
  simulate_temperature_spike
} from '../../../services/faultApi';
import type { FaultCommandPayload } from '../../../types/telemetry';

const faultTypes: FaultCommandPayload['faultType'][] = [
  'high_temperature',
  'radiation_spike',
  'low_battery',
  'heap_exhaustion',
  'communication_loss',
  'queue_stress',
  'task_freeze',
  'emergency_recovery',
  'memory_pressure',
  'communication_dropout',
  'sensor_corruption',
  'cpu_overload'
];

const quickSimulations = [
  { id: 'simulate_temperature_spike', label: 'Temperature Spike', trigger: simulate_temperature_spike, icon: Thermometer },
  { id: 'simulate_radiation_spike', label: 'Radiation Spike', trigger: simulate_radiation_spike, icon: AlertOctagon },
  { id: 'simulate_battery_drop', label: 'Battery Drop', trigger: simulate_battery_drop, icon: Zap },
  { id: 'simulate_heap_exhaustion', label: 'Heap Exhaustion', trigger: simulate_heap_exhaustion, icon: GaugeCircle },
  { id: 'simulate_comm_loss', label: 'Comm Loss', trigger: simulate_comm_loss, icon: Satellite },
  { id: 'simulate_queue_stress', label: 'Queue Stress Test', trigger: simulate_queue_stress, icon: GaugeCircle },
  { id: 'simulate_task_freeze', label: 'Task Freeze (Watchdog)', trigger: simulate_task_freeze, icon: AlertOctagon },
  { id: 'simulate_emergency_recovery', label: 'Emergency Recovery', trigger: simulate_emergency_recovery, icon: Zap }
] as const;

export function FaultInjectionPanel() {
  const [payload, setPayload] = useState<FaultCommandPayload>({
    faultType: 'high_temperature',
    subsystem: 'thermal',
    intensity: 0.7,
    durationMs: 15000,
    reason: 'Mission simulation'
  });
  const [status, setStatus] = useState<string>('');

  const submit = async () => {
    try {
      const command = await sendFaultCommand(payload);
      setStatus(`Command accepted: ${command.commandId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to submit command');
    }
  };

  const runQuickHook = async (id: string, trigger: () => Promise<{ commandId: string }>) => {
    try {
      const command = await trigger();
      setStatus(`${id} accepted: ${command.commandId}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `${id} failed`);
    }
  };

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.18em] text-cyanpulse/85">Fault Injection</h3>
        <AlertOctagon className="h-4 w-4 text-rose-300" />
      </div>

      <div className="mb-4 rounded-xl border border-violet-400/35 bg-violet-500/10 p-3">
        <p className="text-xs uppercase tracking-[0.18em] text-violet-200">Simulation & Testing Hooks</p>
        <p className="mt-1 text-xs text-slate-300">
          Runtime triggers for thermal, radiation, battery, heap, communication, queue stress, task freeze, and emergency recovery testing.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {quickSimulations.map((item) => (
            <button
              key={item.id}
              onClick={() => runQuickHook(item.id, item.trigger)}
              className="flex items-center gap-2 rounded-lg border border-violet-400/35 bg-space-950/65 px-2.5 py-2 text-xs text-violet-100 transition hover:border-violet-300/60"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs uppercase tracking-[0.16em] text-slate-400">
          Fault Type
          <select
            value={payload.faultType}
            onChange={(event) => setPayload((prev) => ({ ...prev, faultType: event.target.value as FaultCommandPayload['faultType'] }))}
            className="w-full rounded-lg border border-slate-600/50 bg-space-900 px-3 py-2 text-sm text-slate-200"
          >
            {faultTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs uppercase tracking-[0.16em] text-slate-400">
          Subsystem
          <input
            value={payload.subsystem}
            onChange={(event) => setPayload((prev) => ({ ...prev, subsystem: event.target.value }))}
            className="w-full rounded-lg border border-slate-600/50 bg-space-900 px-3 py-2 text-sm text-slate-200"
          />
        </label>

        <label className="space-y-1 text-xs uppercase tracking-[0.16em] text-slate-400">
          Intensity (0-1)
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={payload.intensity}
            onChange={(event) => setPayload((prev) => ({ ...prev, intensity: Number(event.target.value) }))}
            className="w-full rounded-lg border border-slate-600/50 bg-space-900 px-3 py-2 text-sm text-slate-200"
          />
        </label>

        <label className="space-y-1 text-xs uppercase tracking-[0.16em] text-slate-400">
          Duration (ms)
          <input
            type="number"
            min={100}
            value={payload.durationMs}
            onChange={(event) => setPayload((prev) => ({ ...prev, durationMs: Number(event.target.value) }))}
            className="w-full rounded-lg border border-slate-600/50 bg-space-900 px-3 py-2 text-sm text-slate-200"
          />
        </label>

        <label className="space-y-1 text-xs uppercase tracking-[0.16em] text-slate-400 sm:col-span-2">
          Reason
          <input
            value={payload.reason}
            onChange={(event) => setPayload((prev) => ({ ...prev, reason: event.target.value }))}
            className="w-full rounded-lg border border-slate-600/50 bg-space-900 px-3 py-2 text-sm text-slate-200"
          />
        </label>
      </div>

      <button
        onClick={submit}
        className="mt-4 rounded-lg border border-cyanpulse/40 bg-cyanpulse/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyanpulse transition hover:bg-cyanpulse/20"
      >
        Dispatch Fault Command
      </button>

      {status ? <p className="mt-3 text-sm text-slate-300">{status}</p> : null}
    </GlassCard>
  );
}
