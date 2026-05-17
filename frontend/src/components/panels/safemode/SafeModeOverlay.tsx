import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface SafeModeOverlayProps {
  active: boolean;
}

export function SafeModeOverlay({ active }: SafeModeOverlayProps) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-rose-950/35 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-[90%] max-w-lg rounded-2xl border border-rose-300/40 bg-space-900/90 p-6 text-center shadow-[0_0_40px_rgba(251,113,133,0.25)]"
          >
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-300" />
            <h2 className="mt-3 text-xl font-semibold tracking-[0.14em] text-rose-100">SAFE MODE ACTIVE</h2>
            <p className="mt-2 text-sm text-slate-200">
              Critical thresholds exceeded. Mission profile shifted to minimal survival operations.
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
