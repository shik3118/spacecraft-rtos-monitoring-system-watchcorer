import type { FaultCommand, FaultCommandPayload } from '../types/telemetry';

function resolveGatewayBase(): string {
  const configured = import.meta.env.VITE_GATEWAY_HTTP_URL;
  if (configured) {
    return configured;
  }

  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  const rawHost = window.location.hostname || 'localhost';
  const host = /^\d+-/.test(rawHost) ? rawHost.replace(/^\d+-/, '8080-') : rawHost;
  return `${protocol}://${host}:8080`;
}

const gatewayBase = resolveGatewayBase();

type HookName =
  | 'simulate_temperature_spike'
  | 'simulate_radiation_spike'
  | 'simulate_battery_drop'
  | 'simulate_heap_exhaustion'
  | 'simulate_comm_loss'
  | 'simulate_queue_stress'
  | 'simulate_task_freeze'
  | 'simulate_emergency_recovery';

interface SimulationHookRequest {
  hook: HookName;
  intensity?: number;
  durationMs?: number;
  reason?: string;
  subsystem?: string;
}

async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(`${gatewayBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(details?.error ?? 'Failed to submit fault command');
  }

  return (await response.json()) as TResponse;
}

export async function sendFaultCommand(payload: FaultCommandPayload): Promise<FaultCommand> {
  const body = await postJson<{ accepted: boolean; command: FaultCommand }>('/api/faults', payload);
  return body.command;
}

export async function triggerSimulationHook(payload: SimulationHookRequest): Promise<FaultCommand> {
  const body = await postJson<{ accepted: boolean; command: FaultCommand }>('/api/faults/simulate', payload);
  return body.command;
}

export function simulate_temperature_spike(): Promise<FaultCommand> {
  return triggerSimulationHook({ hook: 'simulate_temperature_spike' });
}

export function simulate_radiation_spike(): Promise<FaultCommand> {
  return triggerSimulationHook({ hook: 'simulate_radiation_spike' });
}

export function simulate_battery_drop(): Promise<FaultCommand> {
  return triggerSimulationHook({ hook: 'simulate_battery_drop' });
}

export function simulate_heap_exhaustion(): Promise<FaultCommand> {
  return triggerSimulationHook({ hook: 'simulate_heap_exhaustion' });
}

export function simulate_comm_loss(): Promise<FaultCommand> {
  return triggerSimulationHook({ hook: 'simulate_comm_loss' });
}

export function simulate_queue_stress(): Promise<FaultCommand> {
  return triggerSimulationHook({ hook: 'simulate_queue_stress' });
}

export function simulate_task_freeze(): Promise<FaultCommand> {
  return triggerSimulationHook({ hook: 'simulate_task_freeze' });
}

export function simulate_emergency_recovery(): Promise<FaultCommand> {
  return triggerSimulationHook({ hook: 'simulate_emergency_recovery' });
}
