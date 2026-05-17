import { create } from 'zustand';
import type {
  FaultCommand,
  GatewaySnapshotMessage,
  SystemMode,
  TelemetryAlert,
  TelemetryPacket
} from '../types/telemetry';
import type { RtosSchedulerFrame, RtosTask, RtosTaskTransition } from '../types/rtos';

const MAX_TELEMETRY_HISTORY = 180;
const MAX_ALERTS = 120;
const MAX_RTOS_TRANSITIONS = 260;
const MAX_SCHEDULER_FRAMES = 200;

export interface MissionStoreState {
  isConnected: boolean;
  connectionLatencyMs: number | null;
  simulationEnabled: boolean;
  selectedSection: string;
  missionClockStart: number;
  latestPacket: TelemetryPacket | null;
  telemetryHistory: TelemetryPacket[];
  alerts: TelemetryAlert[];
  faultCommands: FaultCommand[];
  mode: SystemMode;
  ingestCount: number;
  parseErrorCount: number;
  rtosTasks: Record<string, RtosTask>;
  rtosTransitions: RtosTaskTransition[];
  schedulerFrames: RtosSchedulerFrame[];
  setSection: (section: string) => void;
  setConnection: (connected: boolean, latencyMs: number | null) => void;
  setSimulationEnabled: (enabled: boolean) => void;
  ingestTelemetry: (packet: TelemetryPacket) => void;
  hydrateFromSnapshot: (snapshot: GatewaySnapshotMessage['data']) => void;
  addParseError: (message: string) => void;
  addFaultCommand: (command: FaultCommand) => void;
  acknowledgeAlert: (id: string) => void;
  replaceRtosTasks: (tasks: RtosTask[]) => void;
  upsertRtosTask: (task: RtosTask) => void;
  removeRtosTask: (taskId: string) => void;
  recordRtosTransition: (transition: RtosTaskTransition) => void;
  ingestSchedulerFrame: (frame: RtosSchedulerFrame) => void;
}

function deriveMessage(packet: TelemetryPacket): string {
  if (packet.severity === 'critical') {
    return `${packet.subsystem.toUpperCase()} entered CRITICAL envelope`;
  }

  if (packet.severity === 'warning') {
    return `${packet.subsystem.toUpperCase()} trending above nominal threshold`;
  }

  return `${packet.subsystem.toUpperCase()} nominal telemetry update`;
}

function tasksArrayToRecord(tasks: RtosTask[]): Record<string, RtosTask> {
  return tasks.reduce<Record<string, RtosTask>>((acc, task) => {
    acc[task.id] = task;
    return acc;
  }, {});
}

export const useMissionStore = create<MissionStoreState>((set) => ({
  isConnected: false,
  connectionLatencyMs: null,
  simulationEnabled: true,
  selectedSection: 'overview',
  missionClockStart: Date.now(),
  latestPacket: null,
  telemetryHistory: [],
  alerts: [],
  faultCommands: [],
  mode: 'nominal',
  ingestCount: 0,
  parseErrorCount: 0,
  rtosTasks: {},
  rtosTransitions: [],
  schedulerFrames: [],
  setSection: (selectedSection) => set({ selectedSection }),
  setConnection: (isConnected, connectionLatencyMs) => set({ isConnected, connectionLatencyMs }),
  setSimulationEnabled: (simulationEnabled) => set({ simulationEnabled }),
  ingestTelemetry: (packet) =>
    set((state) => {
      const telemetryHistory = [...state.telemetryHistory, packet].slice(-MAX_TELEMETRY_HISTORY);
      const maybeAlert: TelemetryAlert = {
        id: `alert-${packet.packetId}-${packet.timestamp}`,
        createdAt: packet.receivedAt,
        severity: packet.severity,
        subsystem: packet.subsystem,
        message: deriveMessage(packet),
        packetId: packet.packetId
      };

      const alerts = packet.severity === 'nominal' ? state.alerts : [maybeAlert, ...state.alerts].slice(0, MAX_ALERTS);

      return {
        latestPacket: packet,
        telemetryHistory,
        alerts,
        mode: packet.mode,
        ingestCount: state.ingestCount + 1
      };
    }),
  hydrateFromSnapshot: (snapshot) =>
    set((state) => ({
      latestPacket: snapshot.latestTelemetry,
      mode: snapshot.latestTelemetry?.mode ?? state.mode,
      ingestCount: snapshot.telemetryStats.ingestCount,
      parseErrorCount: snapshot.telemetryStats.parseErrorCount,
      faultCommands: snapshot.recentFaultCommands
    })),
  addParseError: (message) =>
    set((state) => {
      const parseAlert: TelemetryAlert = {
        id: `parse-${Date.now()}`,
        createdAt: Date.now(),
        severity: 'warning',
        subsystem: 'communication',
        message
      };

      return {
        parseErrorCount: state.parseErrorCount + 1,
        alerts: [parseAlert, ...state.alerts].slice(0, MAX_ALERTS)
      };
    }),
  addFaultCommand: (command) =>
    set((state) => {
      const faultAlert: TelemetryAlert = {
        id: `fault-${command.commandId}`,
        createdAt: command.issuedAt,
        severity: 'warning',
        subsystem: 'system',
        message: `Fault command accepted: ${command.faultType}`,
        packetId: command.commandId
      };

      return {
        faultCommands: [command, ...state.faultCommands].slice(0, 100),
        alerts: [faultAlert, ...state.alerts].slice(0, MAX_ALERTS)
      };
    }),
  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id)
    })),
  replaceRtosTasks: (tasks) => set({ rtosTasks: tasksArrayToRecord(tasks) }),
  upsertRtosTask: (task) =>
    set((state) => ({
      rtosTasks: {
        ...state.rtosTasks,
        [task.id]: task
      }
    })),
  removeRtosTask: (taskId) =>
    set((state) => {
      const next = { ...state.rtosTasks };
      delete next[taskId];
      return { rtosTasks: next };
    }),
  recordRtosTransition: (transition) =>
    set((state) => ({
      rtosTransitions: [transition, ...state.rtosTransitions].slice(0, MAX_RTOS_TRANSITIONS)
    })),
  ingestSchedulerFrame: (frame) =>
    set((state) => ({
      schedulerFrames: [...state.schedulerFrames, frame].slice(-MAX_SCHEDULER_FRAMES)
    }))
}));
