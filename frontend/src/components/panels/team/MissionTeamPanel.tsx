import { Users } from 'lucide-react';
import { GlassCard } from '../../common/GlassCard';
import { MISSION_TEAM } from '../../../constants/team';

interface MissionTeamPanelProps {
  onOpenModal: () => void;
}

export function MissionTeamPanel({ onOpenModal }: MissionTeamPanelProps) {
  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.18em] text-cyanpulse/85">Mission Team</h3>
        <Users className="h-4 w-4 text-cyanpulse" />
      </div>

      <ul className="space-y-2">
        {MISSION_TEAM.map((member) => (
          <li key={member} className="rounded-lg border border-slate-700/45 bg-space-900/60 px-3 py-2 text-sm text-slate-200">
            {member}
          </li>
        ))}
      </ul>

      <button
        onClick={onOpenModal}
        className="mt-4 rounded-lg border border-cyanpulse/40 bg-cyanpulse/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-cyanpulse"
      >
        Open Team Credits
      </button>
    </GlassCard>
  );
}
