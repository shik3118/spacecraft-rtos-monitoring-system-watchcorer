'use strict';

const { WebSocketServer } = require('ws');
const { EVENTS } = require('../events/eventBus');
const logger = require('../logging/runtimeLogger');

function safeSend(client, payload) {
  if (client.readyState !== client.OPEN) {
    return;
  }

  client.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  const encoded = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(encoded);
    }
  });
}

function setupWebSocketManager({ server, eventBus, telemetryStore, faultState }) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const clientId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    logger.info('WebSocket client connected', { clientId, ip: req.socket.remoteAddress });
    eventBus.emit(EVENTS.CLIENT_CONNECTED, { clientId });

    safeSend(ws, {
      type: 'gateway.snapshot',
      data: {
        latestTelemetry: telemetryStore.getLatest(),
        telemetryStats: telemetryStore.getStats(),
        recentFaultCommands: faultState.getRecent(10)
      }
    });

    ws.on('close', () => {
      eventBus.emit(EVENTS.CLIENT_DISCONNECTED, { clientId });
      logger.info('WebSocket client disconnected', { clientId });
    });
  });

  eventBus.on(EVENTS.TELEMETRY_PACKET, (packet) => {
    broadcast(wss, {
      type: 'telemetry.packet',
      data: packet
    });
  });

  eventBus.on(EVENTS.TELEMETRY_PARSE_ERROR, (error) => {
    broadcast(wss, {
      type: 'telemetry.parse_error',
      data: error
    });
  });

  eventBus.on(EVENTS.FAULT_COMMAND_ACCEPTED, (command) => {
    broadcast(wss, {
      type: 'fault.command_accepted',
      data: command
    });
  });

  return wss;
}

module.exports = {
  setupWebSocketManager
};
