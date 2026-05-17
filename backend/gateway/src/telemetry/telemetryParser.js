'use strict';

const logger = require('../logging/runtimeLogger');

class TelemetryParser {
  constructor(validateTelemetryPacket) {
    this.validateTelemetryPacket = validateTelemetryPacket;
  }

  parse(rawPayload, source) {
    let parsed;

    try {
      parsed = typeof rawPayload === 'string'
        ? JSON.parse(rawPayload)
        : JSON.parse(rawPayload.toString('utf8'));
    } catch (err) {
      const error = new Error('Invalid JSON telemetry payload');
      error.details = err.message;
      throw error;
    }

    const valid = this.validateTelemetryPacket(parsed);
    if (!valid) {
      const errors = this.validateTelemetryPacket.errors || [];
      const error = new Error('Telemetry packet schema validation failed');
      error.details = errors;
      throw error;
    }

    const normalized = {
      ...parsed,
      receivedAt: Date.now(),
      source
    };

    logger.debug('Telemetry packet parsed', {
      packetId: normalized.packetId,
      subsystem: normalized.subsystem,
      severity: normalized.severity,
      source
    });

    return normalized;
  }
}

module.exports = {
  TelemetryParser
};
