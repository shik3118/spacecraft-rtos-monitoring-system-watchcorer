export type SystemMode = 'nominal' | 'degraded' | 'safe_mode' | 'recovery';
export type TelemetrySeverity = 'nominal' | 'warning' | 'critical';

export type TelemetrySubsystem =
  | 'cpu'
  | 'heap_stack'
  | 'sensor_health'
  | 'communication'
  | 'thermal'
  | 'power'
  | 'watchdog'
  | 'system';

export interface TelemetryPacket {
  packetId: string;
  timestamp: number;
  subsystem: TelemetrySubsystem;
  severity: TelemetrySeverity;
  mode: SystemMode;
  metrics: Record<string, number | string | boolean | null>;
  event?: string;
  tags?: string[];
  receivedAt: number;
  source: 'http' | 'udp' | 'simulation';
}

export interface TelemetryAlert {
  id: string;
  createdAt: number;
  severity: TelemetrySeverity;
  subsystem: TelemetrySubsystem;
  message: string;
  packetId?: string;
}

export interface FaultCommandPayload {
  commandId?: string;
  faultType:
    | 'high_temperature'
    | 'radiation_spike'
    | 'low_battery'
    | 'heap_exhaustion'
    | 'communication_loss'
    | 'queue_stress'
    | 'task_freeze'
    | 'emergency_recovery'
    | 'memory_pressure'
    | 'communication_dropout'
    | 'sensor_corruption'
    | 'cpu_overload';
  subsystem: string;
  intensity: number;
  durationMs: number;
  reason?: string;
}

export interface FaultCommand extends FaultCommandPayload {
  commandId: string;
  issuedAt: number;
}

export interface GatewayPacketMessage {
  type: 'telemetry.packet';
  data: TelemetryPacket;
}

export interface GatewayParseErrorMessage {
  type: 'telemetry.parse_error';
  data: {
    source: string;
    message: string;
    details?: unknown;
  };
}

export interface GatewayFaultAcceptedMessage {
  type: 'fault.command_accepted';
  data: FaultCommand;
}

export interface GatewaySnapshotMessage {
  type: 'gateway.snapshot';
  data: {
    latestTelemetry: TelemetryPacket | null;
    telemetryStats: {
      ingestCount: number;
      parseErrorCount: number;
      bufferedPackets: number;
      lastIngestAt: number | null;
    };
    recentFaultCommands: FaultCommand[];
  };
}

export type GatewayMessage =
  | GatewayPacketMessage
  | GatewayParseErrorMessage
  | GatewayFaultAcceptedMessage
  | GatewaySnapshotMessage;
