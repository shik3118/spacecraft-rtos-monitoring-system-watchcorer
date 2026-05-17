import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { AlertCenterPanel } from '../components/panels/alerts/AlertCenterPanel';
import { FaultInjectionPanel } from '../components/panels/fault/FaultInjectionPanel';
import { SafeModeOverlay } from '../components/panels/safemode/SafeModeOverlay';
import { SpacecraftVisualizationPanel } from '../components/panels/spacecraft/SpacecraftVisualizationPanel';
import { SystemOverviewPanel } from '../components/panels/system/SystemOverviewPanel';
import { MissionTeamModal } from '../components/panels/team/MissionTeamModal';
import { MissionTeamPanel } from '../components/panels/team/MissionTeamPanel';
import { TelemetryPanel } from '../components/panels/telemetry/TelemetryPanel';
import { RtosTaskVisualizerPanel } from '../components/panels/rtos/RtosTaskVisualizerPanel';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useGatewaySocket } from '../hooks/useGatewaySocket';
import { useTelemetrySimulation } from '../hooks/useTelemetrySimulation';
import { useRtosTaskSimulation } from '../hooks/useRtosTaskSimulation';
import { useMissionStore } from '../store/missionStore';
import { fadeInUp, staggerContainer } from '../utils/animation';

export function MissionControlPage() {
  const [teamOpen, setTeamOpen] = useState(false);
  const mode = useMissionStore((state) => state.mode);
  const selectedSection = useMissionStore((state) => state.selectedSection);

  useGatewaySocket();
  useTelemetrySimulation();
  useRtosTaskSimulation();

  useEffect(() => {
    const target = document.getElementById(`section-${selectedSection}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedSection]);

  return (
    <DashboardLayout onOpenTeamModal={() => setTeamOpen(true)}>
      <SafeModeOverlay active={mode === 'safe_mode'} />
      <MissionTeamModal open={teamOpen} onClose={() => setTeamOpen(false)} />

      <motion.section variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-4 xl:grid-cols-3">
        <motion.div id="section-overview" variants={fadeInUp} className="xl:col-span-2">
          <SystemOverviewPanel />
        </motion.div>
        <motion.div id="section-alerts" variants={fadeInUp}>
          <AlertCenterPanel />
        </motion.div>

        <motion.div id="section-telemetry" variants={fadeInUp} className="xl:col-span-2">
          <TelemetryPanel />
        </motion.div>
        <motion.div id="section-faults" variants={fadeInUp}>
          <FaultInjectionPanel />
        </motion.div>

        <motion.div id="section-rtos" variants={fadeInUp} className="xl:col-span-3">
          <RtosTaskVisualizerPanel />
        </motion.div>

        <motion.div id="section-spacecraft" variants={fadeInUp} className="xl:col-span-2">
          <SpacecraftVisualizationPanel />
        </motion.div>
        <motion.div id="section-team" variants={fadeInUp}>
          <MissionTeamPanel onOpenModal={() => setTeamOpen(true)} />
        </motion.div>
      </motion.section>
    </DashboardLayout>
  );
}
