import { ActivitySquare, Clock3, Signal, UserSquare2 } from 'lucide-react';
import { StatusIndicator } from '../common/StatusIndicator';
import { useMissionStore } from '../../store/missionStore';

interface TopHeaderProps {
  onOpenTeamModal: () => void;
}

function formatMissionTime(start: number): string {
  const elapsedMs = Date.now() - start;
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function TopHeader({ onOpenTeamModal }: TopHeaderProps) {
  const isConnected = useMissionStore((state) => state.isConnected);
  const mode = useMissionStore((state) => state.mode);
  const latency = useMissionStore((state) => state.connectionLatencyMs);
  const missionClockStart = useMissionStore((state) => state.missionClockStart);

  return (
    <header className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-cyanpulse/75">Mission Control Console</p>
        <h2 className="mt-1 text-lg font-medium tracking-[0.08em] text-slate-100">Spacecraft Operations Center</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="glass-chip flex items-center gap-2 text-xs text-slate-300">
          <ActivitySquare className="h-4 w-4 text-cyanpulse" />
          Mode: <strong className="uppercase text-slate-100">{mode.replace('_', ' ')}</strong>
        </div>

        <div className="glass-chip flex items-center gap-2 text-xs text-slate-300">
          <Clock3 className="h-4 w-4 text-cyanpulse" />
          T+ {formatMissionTime(missionClockStart)}
        </div>

        <div className="glass-chip flex items-center gap-2 text-xs text-slate-300">
          <Signal className="h-4 w-4 text-cyanpulse" />
          {latency === null ? 'N/A' : `${latency} ms`}
        </div>

        <button
          onClick={onOpenTeamModal}
          className="glass-chip inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyanpulse transition hover:border-cyanpulse/50"
        >
          <UserSquare2 className="h-4 w-4" />
          Team
        </button>

        <StatusIndicator active={isConnected} label={isConnected ? 'Gateway Linked' : 'Simulation Mode'} />
      </div>
    </header>
  );
}
