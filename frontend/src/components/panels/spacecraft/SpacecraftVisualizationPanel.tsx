import { motion } from 'framer-motion';
import { RadioTower, Satellite, Shield, ThermometerSun, Waves } from 'lucide-react';
import { GlassCard } from '../../common/GlassCard';
import { useMissionStore } from '../../../store/missionStore';
import { SpaceEnvironmentWindow } from './SpaceEnvironmentWindow';
import { SpacecraftHudSchematic } from './SpacecraftHudSchematic';
import { modeClass, subsystemToLabel } from '../../../utils/theme';

const subsystemBadges = [
  { id: 'power', icon: Shield },
  { id: 'communication', icon: RadioTower },
  { id: 'thermal', icon: ThermometerSun },
  { id: 'sensor_health', icon: Waves },
  { id: 'watchdog', icon: Satellite }
] as const;

export function SpacecraftVisualizationPanel() {
  const mode = useMissionStore((state) => state.mode);
  const latestPacket = useMissionStore((state) => state.latestPacket);

  const primaryMetric = Number(latestPacket?.metrics.primary ?? 42);
  const signal = Number(latestPacket?.metrics.signal ?? 96);
  const hotspot = Math.min(100, Math.max(22, primaryMetric + (mode === 'safe_mode' ? 22 : 6)));

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm uppercase tracking-[0.18em] text-cyanpulse/85">Immersive Spacecraft Visualization</h3>
          <p className="mt-1 text-xs text-slate-400">Dragon-inspired cockpit viewport with mission HUD overlays</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[0.64rem] uppercase tracking-[0.2em] ${modeClass(mode)}`}>
          {mode.replace('_', ' ')}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <SpaceEnvironmentWindow />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="hud-chip">
              <p>Thermal</p>
              <strong>{hotspot.toFixed(0)}%</strong>
            </div>
            <div className="hud-chip">
              <p>Signal</p>
              <strong>{signal.toFixed(1)}%</strong>
            </div>
            <div className="hud-chip">
              <p>Primary</p>
              <strong>{primaryMetric.toFixed(1)}</strong>
            </div>
            <div className="hud-chip">
              <p>Subsystem</p>
              <strong>{(latestPacket?.subsystem ?? 'system').slice(0, 6).toUpperCase()}</strong>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <SpacecraftHudSchematic latestPacket={latestPacket} />
          <div className="grid gap-2 sm:grid-cols-2">
            {subsystemBadges.map((item) => {
              const active = latestPacket?.subsystem === item.id;
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: active ? 1 : 0.88 }}
                  className={`rounded-lg border px-3 py-2 text-xs uppercase tracking-[0.16em] ${
                    active
                      ? 'border-cyanpulse/45 bg-cyanpulse/10 text-cyanpulse shadow-[0_0_18px_rgba(67,230,255,0.22)]'
                      : 'border-slate-700/55 bg-space-900/55 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{subsystemToLabel(item.id)}</span>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-700/45 bg-space-900/55 p-2 text-xs text-slate-300">
          Window Scene: <span className="font-mono text-cyanpulse">EARTH ORBIT VISUAL</span>
        </div>
        <div className="rounded-lg border border-slate-700/45 bg-space-900/55 p-2 text-xs text-slate-300">
          Live Link: <span className="font-mono text-emerald-300">COMMS RELAY ACTIVE</span>
        </div>
        <div className="rounded-lg border border-slate-700/45 bg-space-900/55 p-2 text-xs text-slate-300">
          Last Frame: <span className="font-mono text-violet-300">{latestPacket?.packetId ?? 'WAITING STREAM'}</span>
        </div>
      </div>
    </GlassCard>
  );
}
