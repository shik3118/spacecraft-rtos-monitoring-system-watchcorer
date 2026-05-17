import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { MISSION_TEAM } from '../../../constants/team';

interface MissionTeamModalProps {
  open: boolean;
  onClose: () => void;
}

export function MissionTeamModal({ open, onClose }: MissionTeamModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-space-950/70 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="w-full max-w-xl rounded-2xl border border-cyanpulse/35 bg-space-900/90 p-6 shadow-[0_0_40px_rgba(67,230,255,0.2)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyanpulse/80">WatchCoreRT</p>
                <h3 className="text-lg tracking-[0.12em] text-slate-100">Mission Team Credits</h3>
              </div>
              <button onClick={onClose} className="rounded-lg border border-slate-600/60 p-2 text-slate-200 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {MISSION_TEAM.map((member) => (
                <div key={member} className="rounded-xl border border-slate-600/45 bg-space-800/60 px-4 py-3 text-slate-100">
                  {member}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
