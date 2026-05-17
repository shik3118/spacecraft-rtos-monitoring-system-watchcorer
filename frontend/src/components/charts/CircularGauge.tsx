interface CircularGaugeProps {
  value: number;
  label: string;
}

export function CircularGauge({ value, label }: CircularGaugeProps) {
  const pct = Math.max(0, Math.min(100, value));
  const dash = 251.2;
  const offset = dash - (pct / 100) * dash;

  return (
    <div className="relative flex flex-col items-center gap-2">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="rgba(67,230,255,0.95)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={dash}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="absolute top-[32px] text-center">
        <p className="font-mono text-xl text-slate-100">{pct.toFixed(0)}%</p>
      </div>
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">{label}</p>
    </div>
  );
}
