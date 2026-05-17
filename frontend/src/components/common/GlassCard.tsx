import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

interface GlassCardProps extends PropsWithChildren {
  className?: string;
}

export function GlassCard({ className, children }: GlassCardProps) {
  return <section className={clsx('glass-panel p-4 md:p-5', className)}>{children}</section>;
}
