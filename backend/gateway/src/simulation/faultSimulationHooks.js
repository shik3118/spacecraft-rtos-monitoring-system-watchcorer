'use strict';

const DEFAULTS = Object.freeze({
  intensity: 0.75,
  durationMs: 18000,
  reason: 'Runtime simulation trigger'
});

function clampIntensity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULTS.intensity;
  return Math.min(1, Math.max(0, n));
}

function clampDuration(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULTS.durationMs;
  return Math.min(180000, Math.max(1000, Math.round(n)));
}

function buildCommand({ faultType, subsystem, intensity, durationMs, reason, testClass, tags = [] }) {
  return {
    faultType,
    subsystem,
    intensity: clampIntensity(intensity),
    durationMs: clampDuration(durationMs),
    reason: reason || DEFAULTS.reason,
    simulation: {
      testClass,
      tags
    }
  };
}

function simulate_temperature_spike(overrides = {}) {
  return buildCommand({
    faultType: 'high_temperature',
    subsystem: 'thermal',
    intensity: 0.84,
    durationMs: 24000,
    reason: 'Thermal runaway simulation',
    testClass: 'fault-injection',
    tags: ['runtime', 'watchdog', 'temperature'],
    ...overrides
  });
}

function simulate_radiation_spike(overrides = {}) {
  return buildCommand({
    faultType: 'radiation_spike',
    subsystem: 'sensor_health',
    intensity: 0.88,
    durationMs: 22000,
    reason: 'Radiation burst upset simulation',
    testClass: 'fault-injection',
    tags: ['runtime', 'sensor-integrity', 'radiation'],
    ...overrides
  });
}

function simulate_battery_drop(overrides = {}) {
  return buildCommand({
    faultType: 'low_battery',
    subsystem: 'power',
    intensity: 0.72,
    durationMs: 28000,
    reason: 'Battery discharge drop simulation',
    testClass: 'power-reliability',
    tags: ['runtime', 'power', 'degradation'],
    ...overrides
  });
}

function simulate_heap_exhaustion(overrides = {}) {
  return buildCommand({
    faultType: 'heap_exhaustion',
    subsystem: 'heap_stack',
    intensity: 0.92,
    durationMs: 26000,
    reason: 'Heap exhaustion pressure simulation',
    testClass: 'memory-pressure',
    tags: ['runtime', 'memory', 'exhaustion'],
    ...overrides
  });
}

function simulate_comm_loss(overrides = {}) {
  return buildCommand({
    faultType: 'communication_loss',
    subsystem: 'communication',
    intensity: 0.81,
    durationMs: 21000,
    reason: 'Deep-space communication loss simulation',
    testClass: 'comms-resilience',
    tags: ['runtime', 'network', 'dropout'],
    ...overrides
  });
}

function simulate_queue_stress(overrides = {}) {
  return buildCommand({
    faultType: 'queue_stress',
    subsystem: 'system',
    intensity: 0.95,
    durationMs: 18000,
    reason: 'Queue stress and backpressure test',
    testClass: 'queue-stress',
    tags: ['stress', 'scheduler', 'queue-depth'],
    ...overrides
  });
}

function simulate_task_freeze(overrides = {}) {
  return buildCommand({
    faultType: 'task_freeze',
    subsystem: 'watchdog',
    intensity: 0.85,
    durationMs: 14000,
    reason: 'Task deadlock freeze simulation for watchdog',
    testClass: 'watchdog-testing',
    tags: ['freeze', 'watchdog', 'recovery'],
    ...overrides
  });
}

function simulate_emergency_recovery(overrides = {}) {
  return buildCommand({
    faultType: 'emergency_recovery',
    subsystem: 'system',
    intensity: 0.67,
    durationMs: 20000,
    reason: 'Emergency recovery orchestration test',
    testClass: 'recovery',
    tags: ['recovery', 'emergency', 'safe-mode'],
    ...overrides
  });
}

const SIMULATION_HOOKS = Object.freeze({
  simulate_temperature_spike,
  simulate_radiation_spike,
  simulate_battery_drop,
  simulate_heap_exhaustion,
  simulate_comm_loss,
  simulate_queue_stress,
  simulate_task_freeze,
  simulate_emergency_recovery
});

module.exports = {
  SIMULATION_HOOKS,
  simulate_temperature_spike,
  simulate_radiation_spike,
  simulate_battery_drop,
  simulate_heap_exhaustion,
  simulate_comm_loss,
  simulate_queue_stress,
  simulate_task_freeze,
  simulate_emergency_recovery
};
