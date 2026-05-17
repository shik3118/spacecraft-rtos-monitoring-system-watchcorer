import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { SidebarNav } from './SidebarNav';
import { TopHeader } from './TopHeader';
import { useMissionStore } from '../../store/missionStore';

interface DashboardLayoutProps extends PropsWithChildren {
  onOpenTeamModal: () => void;
}

export function DashboardLayout({ children, onOpenTeamModal }: DashboardLayoutProps) {
  const selectedSection = useMissionStore((state) => state.selectedSection);
  const setSection = useMissionStore((state) => state.setSection);
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024);
  const [mobileOpen, setMobileOpen] = useState<boolean>(window.innerWidth >= 1024);

  useEffect(() => {
    const handler = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setMobileOpen(true);
      }
    };

    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className="relative min-h-screen">
      <SidebarNav
        selectedSection={selectedSection}
        onSelect={setSection}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        isDesktop={isDesktop}
      />
      <div className="relative min-h-screen lg:pl-72">
        <main className="p-4 lg:p-7">
          <TopHeader onOpenTeamModal={onOpenTeamModal} />
          {children}
        </main>
      </div>
    </div>
  );
}
