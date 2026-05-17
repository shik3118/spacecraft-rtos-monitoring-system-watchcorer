import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartPoint } from './TelemetryLineChart';

interface TelemetryAreaChartProps {
  data: ChartPoint[];
  color?: string;
}

export function TelemetryAreaChart({ data, color = '#4c6fff' }: TelemetryAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="telemetry-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.45} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          contentStyle={{
            borderRadius: '0.75rem',
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(9,12,22,0.95)',
            color: '#e2e8f0'
          }}
        />
        <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill="url(#telemetry-gradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
