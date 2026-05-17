import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { NAV_ITEMS } from '../../constants/navigation';
import { GlowingBrand } from '../common/GlowingBrand';

interface SidebarNavProps {
  selectedSection: string;
  onSelect: (section: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isDesktop: boolean;
}

export function SidebarNav({
  selectedSection,
  onSelect,
  mobileOpen,
  setMobileOpen,
  isDesktop
}: SidebarNavProps) {
  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-40 rounded-xl border border-slate-600/50 bg-space-900/70 p-2 text-cyanpulse lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <motion.aside
        initial={false}
        animate={{ x: isDesktop || mobileOpen ? 0 : -320 }}
        className="fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-700/50 bg-space-950/95 p-5 backdrop-blur-xl"
      >
        <div className="mb-8 mt-10 lg:mt-0">
          <GlowingBrand />
        </div>

        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const active = selectedSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  if (!isDesktop) {
                    setMobileOpen(false);
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? 'border-cyanpulse/40 bg-cyanpulse/10 text-cyanpulse glow-border'
                    : 'border-slate-700/45 bg-space-900/55 text-slate-300 hover:border-slate-500/70 hover:text-slate-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
}
