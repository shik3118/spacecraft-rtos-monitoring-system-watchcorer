import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, Gauge, GitFork, Orbit, Shield, Users } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'System Overview', icon: Gauge },
  { id: 'telemetry', label: 'Telemetry Streams', icon: Activity },
  { id: 'alerts', label: 'Alert Center', icon: AlertTriangle },
  { id: 'faults', label: 'Fault Injection', icon: Shield },
  { id: 'rtos', label: 'RTOS Visualizer', icon: GitFork },
  { id: 'spacecraft', label: 'Spacecraft View', icon: Orbit },
  { id: 'team', label: 'Mission Team', icon: Users }
];
