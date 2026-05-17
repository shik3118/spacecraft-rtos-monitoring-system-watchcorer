'use strict';

const { EVENTS } = require('../events/eventBus');

const SCENARIO_CONFIG = Object.freeze({
  high_temperature: {
    subsystem: 'thermal',
    severity: 'critical',
    mode: 'safe_mode',
    event: 'temperature.spike',
    tags: ['temperature', 'fault-injection', 'watchdog']
  },
  radiation_spike: {
    subsystem: 'sensor_health',
    severity: 'critical',
    mode: 'safe_mode',
    event: 'radiation.spike',
    tags: ['radiation', 'sensor-health', 'fault-injection']
  },
  low_battery: {
    subsystem: 'power',
    severity: 'warning',
    mode: 'degraded',
    event: 'power.battery_drop',
    tags: ['power', 'degradation']
  },
  heap_exhaustion: {
    subsystem: 'heap_stack',
    severity: 'critical',
    mode: 'safe_mode',
    event: 'memory.heap_exhaustion',
    tags: ['memory', 'pressure', 'allocator']
  },
  communication_loss: {
    subsystem: 'communication',
    severity: 'critical',
    mode: 'safe_mode',
    event: 'comms.loss',
    tags: ['communication', 'dropout', 'link-loss']
  },
  queue_stress: {
    subsystem: 'system',
    severity: 'warning',
    mode: 'degraded',
    event: 'scheduler.queue_stress',
    tags: ['queue', 'stress', 'throughput']
  },
  task_freeze: {
    subsystem: 'watchdog',
    severity: 'critical',
    mode: 'safe_mode',
    event: 'watchdog.task_freeze',
    tags: ['watchdog', 'freeze', 'deadlock']
  },
  emergency_recovery: {
    subsystem: 'system',
    severity: 'warning',
    mode: 'recovery',
    event: 'system.emergency_recovery',
    tags: ['recovery', 'emergency', 'safe-mode']
  }
});

function clampIntensity(intensity) {
  const n = Number(intensity);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function clampDuration(durationMs) {
  const n = Number(durationMs);
  if (!Number.isFinite(n)) return 10000;
  return Math.max(1000, Math.min(180000, Math.round(n)));
}

function jitter(amplitude) {
  return (Math.random() * 2 - 1) * amplitude;
}

function packetBase(command, profile, eventSuffix = 'active') {
  const timestamp = Date.now();
  return {
    packetId: `sim-${command.commandId}-${timestamp}-${Math.floor(Math.random() * 1e4)}`,
    timestamp,
    subsystem: command.subsystem || profile.subsystem,
    severity: profile.severity,
    mode: profile.mode,
    event: `${profile.event}.${eventSuffix}`,
    tags: [...profile.tags, ...(command.simulation?.tags || [])],
    receivedAt: timestamp,
    source: 'simulation'
  };
}

function scenarioMetrics(command, elapsedRatio, cycle) {
  const intensity = clampIntensity(command.intensity);

  switch (command.faultType) {
    case 'high_temperature':
      return {
        primary: Number((74 + intensity * 34 + jitter(3)).toFixed(2)),
        thermalGradient: Number((8 + intensity * 21 + jitter(1.8)).toFixed(2)),
        coolingDutyCycle: Number((55 + intensity * 40 + jitter(4)).toFixed(2)),
        queueDepth: Math.round(6 + intensity * 22 + Math.max(0, jitter(3)))
      };

    case 'radiation_spike':
      return {
        primary: Number((68 + intensity * 30 + jitter(2.5)).toFixed(2)),
        seiRate: Number((20 + intensity * 140 + jitter(12)).toFixed(2)),
        crcErrorRate: Number((1 + intensity * 7 + jitter(0.6)).toFixed(2)),
        sensorDegradation: Number((18 + elapsedRatio * 42 + jitter(2)).toFixed(2))
      };

    case 'low_battery':
      return {
        primary: Number((38 - elapsedRatio * (25 + intensity * 20) + jitter(1.1)).toFixed(2)),
        voltage: Number((28 - elapsedRatio * (9 + intensity * 4) + jitter(0.35)).toFixed(2)),
        dischargeRate: Number((0.5 + intensity * 2.8 + jitter(0.2)).toFixed(2)),
        loadShedding: elapsedRatio > 0.58
      };

    case 'heap_exhaustion':
      return {
        primary: Number((75 + intensity * 24 + jitter(1.6)).toFixed(2)),
        heapUsagePct: Number((70 + intensity * 28 + elapsedRatio * 10 + jitter(1.5)).toFixed(2)),
        allocFailureRate: Number((1 + intensity * 20 + elapsedRatio * 8 + jitter(1.2)).toFixed(2)),
        freeBlocks: Math.max(0, Math.round(40 - intensity * 30 - elapsedRatio * 22 + jitter(3)))
      };

    case 'communication_loss':
      return {
        primary: Number((22 - intensity * 18 - elapsedRatio * 4 + jitter(0.7)).toFixed(2)),
        signal: Number((24 - intensity * 20 - elapsedRatio * 8 + jitter(1)).toFixed(2)),
        packetLossPct: Number((35 + intensity * 58 + elapsedRatio * 5 + jitter(2)).toFixed(2)),
        linkAlive: elapsedRatio < 0.3
      };

    case 'queue_stress':
      return {
        primary: Number((66 + intensity * 22 + jitter(2)).toFixed(2)),
        queueDepth: Math.round(30 + intensity * 140 + elapsedRatio * 40 + jitter(8)),
        readyTaskCount: Math.round(7 + intensity * 18 + jitter(2)),
        contextSwitchRate: Number((90 + intensity * 180 + jitter(12)).toFixed(2))
      };

    case 'task_freeze':
      return {
        primary: Number((82 + intensity * 17 + jitter(1.1)).toFixed(2)),
        heartbeatGapMs: Math.round(700 + intensity * 7000 + elapsedRatio * 1400 + jitter(120)),
        frozenTask: `Task-${Math.max(1, (cycle % 6) + 1)}`,
        watchdogRestartPending: elapsedRatio > 0.46
      };

    case 'emergency_recovery':
      return {
        primary: Number((58 + jitter(2)).toFixed(2)),
        recoveryStage: elapsedRatio < 0.33 ? 'triage' : elapsedRatio < 0.66 ? 'stabilize' : 'restore',
        restoredSubsystems: Math.round(elapsedRatio * 7),
        taskRestartCount: Math.round(intensity * 4 + elapsedRatio * 6)
      };

    default:
      return {
        primary: Number((40 + intensity * 40 + jitter(2)).toFixed(2)),
        stressIndex: Number((intensity * 100 + jitter(3)).toFixed(2))
      };
  }
}

class RuntimeSimulationEngine {
  constructor({ eventBus, telemetryStore }) {
    this.eventBus = eventBus;
    this.telemetryStore = telemetryStore;
    this.activeScenarios = new Map();
  }

  run(command) {
    const profile = SCENARIO_CONFIG[command.faultType];
    if (!profile) {
      return null;
    }

    this.stop(command.commandId);

    const startedAt = Date.now();
    const durationMs = clampDuration(command.durationMs);
    const cadenceMs = command.faultType === 'queue_stress' ? 280 : 900;
    let cycle = 0;

    const emitPacket = (suffix) => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(1, elapsed / durationMs);
      const metrics = scenarioMetrics(command, ratio, cycle);
      const packet = {
        ...packetBase(command, profile, suffix),
        metrics
      };

      this.telemetryStore.addPacket(packet);
      this.eventBus.emit(EVENTS.TELEMETRY_PACKET, packet);
    };

    emitPacket('start');

    const interval = setInterval(() => {
      cycle += 1;

      if (Date.now() - startedAt >= durationMs) {
        clearInterval(interval);
        emitPacket('end');

        if (command.faultType === 'task_freeze') {
          const recoveryPacket = {
            ...packetBase(command, SCENARIO_CONFIG.emergency_recovery, 'watchdog_recovery'),
            severity: 'warning',
            mode: 'recovery',
            metrics: {
              primary: 61,
              watchdogRestart: true,
              restartedTask: 'FrozenWorkerTask',
              recoveryEtaMs: 4200
            }
          };

          this.telemetryStore.addPacket(recoveryPacket);
          this.eventBus.emit(EVENTS.TELEMETRY_PACKET, recoveryPacket);
        }

        this.activeScenarios.delete(command.commandId);
        return;
      }

      const bursts = command.faultType === 'queue_stress' ? Math.max(2, Math.round(2 + command.intensity * 6)) : 1;
      for (let i = 0; i < bursts; i += 1) {
        emitPacket('active');
      }
    }, cadenceMs);

    this.activeScenarios.set(command.commandId, {
      interval,
      startedAt,
      durationMs,
      command
    });

    return {
      commandId: command.commandId,
      startedAt,
      durationMs,
      faultType: command.faultType
    };
  }

  stop(commandId) {
    const existing = this.activeScenarios.get(commandId);
    if (!existing) {
      return false;
    }

    clearInterval(existing.interval);
    this.activeScenarios.delete(commandId);
    return true;
  }

  getActiveScenarios() {
    return [...this.activeScenarios.values()].map((entry) => ({
      commandId: entry.command.commandId,
      faultType: entry.command.faultType,
      startedAt: entry.startedAt,
      durationMs: entry.durationMs,
      subsystem: entry.command.subsystem
    }));
  }
}

module.exports = {
  RuntimeSimulationEngine,
  SCENARIO_CONFIG
};
