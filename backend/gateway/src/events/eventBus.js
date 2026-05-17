'use strict';

const { EventEmitter } = require('events');

const eventBus = new EventEmitter();
eventBus.setMaxListeners(64);

const EVENTS = Object.freeze({
  TELEMETRY_PACKET: 'telemetry.packet',
  TELEMETRY_PARSE_ERROR: 'telemetry.parse_error',
  TELEMETRY_INGESTED: 'telemetry.ingested',
  FAULT_COMMAND_ACCEPTED: 'fault.command_accepted',
  FAULT_COMMAND_REJECTED: 'fault.command_rejected',
  CLIENT_CONNECTED: 'ws.client_connected',
  CLIENT_DISCONNECTED: 'ws.client_disconnected'
});

module.exports = {
  eventBus,
  EVENTS
};
