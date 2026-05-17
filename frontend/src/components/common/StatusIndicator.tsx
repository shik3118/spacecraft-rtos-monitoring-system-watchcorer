import clsx from 'clsx';

interface StatusIndicatorProps {
  active: boolean;
  label: string;
  className?: string;
}

export function StatusIndicator({ active, label, className }: StatusIndicatorProps) {
  return (
    <div className={clsx('inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em]', className)}>
      <span
        className={clsx(
          'h-2.5 w-2.5 rounded-full',
          active ? 'animate-pulse bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]' : 'bg-slate-500'
        )}
      />
      <span className="text-slate-300">{label}</span>
    </div>
  );
}
