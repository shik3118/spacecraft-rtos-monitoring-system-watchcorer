'use strict';

const dgram = require('dgram');
const { EVENTS } = require('../events/eventBus');
const logger = require('../logging/runtimeLogger');

function startTelemetryUdpIngestor({ eventBus, udpPort, maxPayloadBytes }) {
  const socket = dgram.createSocket('udp4');

  socket.on('message', (msg, rinfo) => {
    if (msg.length > maxPayloadBytes) {
      eventBus.emit(EVENTS.TELEMETRY_PARSE_ERROR, {
        source: 'udp',
        reason: 'payload_too_large',
        ip: rinfo.address,
        port: rinfo.port,
        bytes: msg.length
      });
      return;
    }

    eventBus.emit(EVENTS.TELEMETRY_INGESTED, {
      source: 'udp',
      payload: msg,
      remote: { ip: rinfo.address, port: rinfo.port }
    });
  });

  socket.on('error', (err) => {
    logger.error('Telemetry UDP ingestor error', { error: err.message });
  });

  socket.bind(udpPort, '0.0.0.0', () => {
    logger.info('Telemetry UDP ingestor started', { udpPort });
  });

  return socket;
}

module.exports = {
  startTelemetryUdpIngestor
};
