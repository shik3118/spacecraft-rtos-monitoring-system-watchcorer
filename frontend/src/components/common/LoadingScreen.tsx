import { motion } from 'framer-motion';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-space-950">
      <span className="absolute inset-0 bg-aero-grid bg-[size:30px_30px] opacity-45" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="relative h-24 w-24 rounded-full border border-cyanpulse/40"
        >
          <span className="absolute inset-2 rounded-full border border-violet-400/35" />
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-cyanpulse shadow-[0_0_12px_rgba(67,230,255,1)]" />
        </motion.div>
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.34em] text-cyanpulse/85">Boot Sequence</p>
          <h2 className="mt-2 text-2xl tracking-[0.2em] text-white">WatchCoreRT</h2>
          <p className="mt-2 text-xs text-slate-400">Initializing mission control matrix...</p>
        </div>
      </motion.div>
    </div>
  );
}
