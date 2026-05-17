import type { SystemMode, TelemetrySeverity } from '../types/telemetry';

export function severityClass(severity: TelemetrySeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-rose-300 bg-rose-500/15 border-rose-400/40';
    case 'warning':
      return 'text-amber-200 bg-amber-500/15 border-amber-300/40';
    default:
      return 'text-emerald-200 bg-emerald-500/15 border-emerald-300/40';
  }
}

export function modeClass(mode: SystemMode): string {
  switch (mode) {
    case 'safe_mode':
      return 'text-rose-200 bg-rose-500/20 border-rose-300/50';
    case 'recovery':
      return 'text-violet-200 bg-violet-500/20 border-violet-300/50';
    case 'degraded':
      return 'text-amber-200 bg-amber-500/20 border-amber-300/50';
    default:
      return 'text-cyan-100 bg-cyan-500/15 border-cyan-200/50';
  }
}

export function subsystemToLabel(value: string): string {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
