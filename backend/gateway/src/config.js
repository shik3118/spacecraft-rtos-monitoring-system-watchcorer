'use strict';

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: readNumber('GATEWAY_PORT', 8080)
  },
  telemetry: {
    udpPort: readNumber('TELEMETRY_UDP_PORT', 7001),
    maxPayloadBytes: readNumber('TELEMETRY_MAX_PAYLOAD_BYTES', 8192),
    historyDepth: readNumber('TELEMETRY_HISTORY_DEPTH', 250)
  },
  faultInjection: {
    queueDepth: readNumber('FAULT_QUEUE_DEPTH', 100)
  }
};
