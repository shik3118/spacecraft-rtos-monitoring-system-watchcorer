import { motion } from 'framer-motion';

export function SpaceEnvironmentWindow() {
  return (
    <div className="relative h-[280px] w-full overflow-hidden rounded-2xl border border-cyanpulse/25 bg-space-950/85 shadow-[inset_0_0_40px_rgba(67,230,255,0.08)]">
      <div className="absolute inset-0 space-stars-layer stars-near" />
      <div className="absolute inset-0 space-stars-layer stars-mid" />
      <div className="absolute inset-0 space-stars-layer stars-far" />

      <motion.div
        className="earth-orbit-wrapper"
        animate={{ rotate: 360 }}
        transition={{ duration: 140, repeat: Infinity, ease: 'linear' }}
      >
        <div className="earth-glow-ring" />
        <div className="earth-sphere" />
        <div className="earth-atmosphere" />
      </motion.div>

      <div className="orbital-trajectory orbital-trajectory-1" />
      <div className="orbital-trajectory orbital-trajectory-2" />

      <motion.div
        className="absolute right-8 top-8 rounded-full border border-cyanpulse/60 bg-cyanpulse/20 p-2"
        animate={{ scale: [1, 1.3, 1], opacity: [0.45, 1, 0.45] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
      />

      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-cyanpulse/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-space-950/80 to-transparent" />
      <div className="window-vignette" />
    </div>
  );
}
