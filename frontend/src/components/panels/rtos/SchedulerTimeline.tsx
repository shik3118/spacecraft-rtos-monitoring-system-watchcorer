import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { RtosSchedulerFrame } from '../../../types/rtos';
import { buildSchedulerTimeline } from './utils/rtosViewModel';

interface SchedulerTimelineProps {
  frames: RtosSchedulerFrame[];
}

export function SchedulerTimeline({ frames }: SchedulerTimelineProps) {
  const timeline = buildSchedulerTimeline(frames);

  return (
    <div className="rounded-xl border border-slate-700/55 bg-space-900/55 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs uppercase tracking-[0.2em] text-cyanpulse/90">RTOS Scheduling Timeline</h4>
        <span className="text-[0.65rem] text-slate-400">Last {timeline.length} scheduler frames</span>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={timeline} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="readyQueueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#43e6ff" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#43e6ff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="blockedQueueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="rgba(148,163,184,0.14)" strokeDasharray="3 3" />
          <XAxis dataKey="tick" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={22} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={34} />

          <Tooltip
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(9,12,22,0.95)',
              color: '#e2e8f0'
            }}
          />

          <Area type="monotone" dataKey="ready" stroke="#43e6ff" fill="url(#readyQueueGradient)" strokeWidth={1.8} />
          <Area type="monotone" dataKey="blocked" stroke="#f59e0b" fill="url(#blockedQueueGradient)" strokeWidth={1.7} />
          <Line type="monotone" dataKey="suspended" stroke="#f43f5e" strokeWidth={1.9} dot={false} />
          <Line type="stepAfter" dataKey="running" stroke="#4ade80" strokeWidth={2.3} dot={false} />
          <Line type="monotone" dataKey="restarted" stroke="#a78bfa" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap gap-2 text-[0.62rem] uppercase tracking-[0.18em] text-slate-300">
        <span className="glass-chip border-cyan-400/40 text-cyan-200">Ready Queue</span>
        <span className="glass-chip border-amber-400/40 text-amber-200">Blocked Queue</span>
        <span className="glass-chip border-rose-400/40 text-rose-200">Suspended Queue</span>
        <span className="glass-chip border-emerald-400/40 text-emerald-200">Running Slot</span>
        <span className="glass-chip border-violet-400/40 text-violet-200">Restart Events</span>
      </div>
    </div>
  );
}
