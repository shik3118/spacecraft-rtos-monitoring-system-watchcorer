import { motion } from 'framer-motion';

export function GlowingBrand() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <span className="absolute -inset-2 rounded-xl bg-cyanpulse/20 blur-xl" aria-hidden />
      <div className="relative rounded-xl border border-cyanpulse/30 bg-space-900/70 px-3 py-2">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.32em] text-cyanpulse/80">Project</p>
        <h1 className="text-xl font-semibold tracking-[0.17em] text-slate-50">WatchCoreRT</h1>
      </div>
    </motion.div>
  );
}
