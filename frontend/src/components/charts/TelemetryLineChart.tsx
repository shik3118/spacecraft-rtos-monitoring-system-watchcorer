import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface ChartPoint {
  time: string;
  value: number;
}

interface TelemetryLineChartProps {
  data: ChartPoint[];
  color?: string;
  valueLabel?: string;
}

export function TelemetryLineChart({
  data,
  color = '#43e6ff',
  valueLabel = 'Value'
}: TelemetryLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          contentStyle={{
            borderRadius: '0.75rem',
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(9,12,22,0.95)',
            color: '#e2e8f0'
          }}
          formatter={(value) => [`${Number(value).toFixed(2)}`, valueLabel]}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
