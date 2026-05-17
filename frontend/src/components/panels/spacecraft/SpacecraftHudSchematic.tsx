import { motion } from 'framer-motion';
import type { TelemetryPacket, TelemetrySubsystem } from '../../../types/telemetry';

type NodePoint = {
  subsystem: TelemetrySubsystem;
  x: number;
  y: number;
  label: string;
};

const subsystemNodes: NodePoint[] = [
  { subsystem: 'power', x: 112, y: 88, label: 'PWR' },
  { subsystem: 'communication', x: 208, y: 88, label: 'COM' },
  { subsystem: 'thermal', x: 160, y: 124, label: 'THM' },
  { subsystem: 'cpu', x: 160, y: 78, label: 'CPU' },
  { subsystem: 'sensor_health', x: 160, y: 50, label: 'SNS' },
  { subsystem: 'watchdog', x: 160, y: 146, label: 'WDT' },
  { subsystem: 'heap_stack', x: 160, y: 102, label: 'MEM' }
];

interface SpacecraftHudSchematicProps {
  latestPacket: TelemetryPacket | null;
}

function statusTone(active: boolean): string {
  if (!active) {
    return 'rgba(148,163,184,0.35)';
  }
  return 'rgba(67,230,255,0.95)';
}

export function SpacecraftHudSchematic({ latestPacket }: SpacecraftHudSchematicProps) {
  const activeSubsystem = latestPacket?.subsystem;
  const hotspotIntensity = Number(latestPacket?.metrics.primary ?? 45);
  const thermalRadius = 22 + Math.min(28, hotspotIntensity * 0.2);

  return (
    <div className="relative h-[280px] w-full overflow-hidden rounded-2xl border border-slate-600/40 bg-space-900/65 p-2">
      <div className="radar-sweep" />

      <motion.svg
        viewBox="0 0 320 180"
        className="h-full w-full"
        initial={{ opacity: 0.7, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <defs>
          <linearGradient id="panel-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(67,230,255,0.28)" />
            <stop offset="100%" stopColor="rgba(76,111,255,0.16)" />
          </linearGradient>
          <radialGradient id="hotspot-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(248,113,113,0.85)" />
            <stop offset="65%" stopColor="rgba(251,146,60,0.28)" />
            <stop offset="100%" stopColor="rgba(251,146,60,0)" />
          </radialGradient>
        </defs>

        <rect x="126" y="36" width="68" height="108" rx="12" fill="url(#panel-gradient)" stroke="rgba(136,247,255,0.75)" />

        <g className="solar-panels">
          <rect x="80" y="72" width="46" height="40" rx="6" fill="rgba(67,230,255,0.12)" stroke="rgba(67,230,255,0.85)" />
          <rect x="194" y="72" width="46" height="40" rx="6" fill="rgba(67,230,255,0.12)" stroke="rgba(67,230,255,0.85)" />
        </g>

        <polygon points="160,16 177,36 143,36" fill="rgba(148,163,184,0.45)" stroke="rgba(136,247,255,0.75)" />
        <circle cx="160" cy="92" r="18" fill="rgba(67,230,255,0.2)" stroke="rgba(67,230,255,0.9)" />
        <circle cx="160" cy="92" r="6" fill="rgba(255,255,255,0.95)" />

        <circle cx="160" cy="124" r={thermalRadius} fill="url(#hotspot-gradient)" />

        <path
          d="M60,88 C95,60 125,60 160,92"
          fill="none"
          stroke="rgba(67,230,255,0.45)"
          strokeDasharray="5 5"
          className="comm-link"
        />
        <path
          d="M260,88 C225,60 195,60 160,92"
          fill="none"
          stroke="rgba(67,230,255,0.45)"
          strokeDasharray="5 5"
          className="comm-link"
        />

        {subsystemNodes.map((node) => {
          const active = activeSubsystem === node.subsystem;
          return (
            <g key={node.subsystem}>
              <line x1="160" y1="92" x2={node.x} y2={node.y} stroke={statusTone(active)} strokeWidth="1.1" opacity={active ? 1 : 0.58} />
              <circle cx={node.x} cy={node.y} r={active ? 5.2 : 3.5} fill={statusTone(active)} className={active ? 'subsystem-active-dot' : ''} />
              <text x={node.x + 7} y={node.y + 3} fontSize="8" fill="rgba(226,232,240,0.9)">
                {node.label}
              </text>
            </g>
          );
        })}
      </motion.svg>

      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-cyanpulse/20 shadow-[inset_0_0_50px_rgba(67,230,255,0.08)]" />
      <div className="pointer-events-none absolute inset-0 hud-grid-overlay" />
    </div>
  );
}
