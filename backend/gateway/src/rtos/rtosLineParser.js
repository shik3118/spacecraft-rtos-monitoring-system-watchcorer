'use strict';

function mapSubsystem(raw) {
  const source = String(raw || 'system').toLowerCase();
  if (source === 'comms') return 'communication';
  if (source === 'emergency') return 'system';
  if (source === 'payload') return 'system';
  if (source === 'adcs') return 'system';
  if (source === 'unknown') return 'system';
  return source;
}

function mapSeverity(line) {
  const level = String(line.level || '').toLowerCase();
  if (level === 'critical') return 'critical';
  if (level === 'warning') return 'warning';

  const type = String(line.type || '').toLowerCase();
  if (type === 'fault') return 'critical';
  if (type === 'safe_mode') return 'warning';

  return 'nominal';
}

function mapMode(line, severity) {
  if (typeof line.mode === 'string') {
    const mode = line.mode.toLowerCase();
    if (mode === 'safe' || mode === 'safe_mode') return 'safe_mode';
    if (mode === 'degraded') return 'degraded';
    if (mode === 'recovery') return 'recovery';
    return 'nominal';
  }

  const type = String(line.type || '').toLowerCase();
  if (type === 'safe_mode') return 'safe_mode';
  if (severity === 'critical') return 'safe_mode';
  if (severity === 'warning') return 'degraded';
  return 'nominal';
}

function parseRtosLineToTelemetryPacket(rawLine) {
  const line = JSON.parse(rawLine);

  const severity = mapSeverity(line);
  const subsystem = mapSubsystem(line.src || line.type || 'system');
  const mode = mapMode(line, severity);

  const metrics = {
    primary: typeof line.value === 'number' ? Number(line.value.toFixed(2)) : 0,
    proto: Number.isFinite(Number(line.proto)) ? Number(line.proto) : 1,
    tick: Number.isFinite(Number(line.tick)) ? Number(line.tick) : 0,
    queueEmergency: Number.isFinite(Number(line.q_emergency)) ? Number(line.q_emergency) : 0,
    queueTelemetry: Number.isFinite(Number(line.q_telemetry)) ? Number(line.q_telemetry) : 0,
    spacecraft: line.sc || 'SIM-ORBITER-01'
  };

  return {
    packetId: `rtos-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    timestamp: Date.now(),
    subsystem,
    severity,
    mode,
    metrics,
    event: String(line.type || 'diagnostic'),
    tags: ['rtos', 'stdout-bridge'],
    source: 'simulation'
  };
}

module.exports = {
  parseRtosLineToTelemetryPacket
};
