'use strict';

const http = require('http');
const express = require('express');
const cors = require('cors');

const config = require('./config');
const logger = require('./logging/runtimeLogger');
const { eventBus, EVENTS } = require('./events/eventBus');
const { loadSchemas } = require('./schemas/loadSchemas');
const { TelemetryParser } = require('./telemetry/telemetryParser');
const { TelemetryStore } = require('./state/telemetryStore');
const { FaultState } = require('./state/faultState');
const { createTelemetryRoutes } = require('./routes/telemetryRoutes');
const { createFaultInjectionRoutes } = require('./routes/faultInjectionRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { setupWebSocketManager } = require('./websocket/websocketManager');
const { startTelemetryUdpIngestor } = require('./telemetry/telemetryIngestor');
const { RuntimeSimulationEngine } = require('./simulation/runtimeSimulationEngine');
const { SIMULATION_HOOKS } = require('./simulation/faultSimulationHooks');

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));

const { validateTelemetryPacket, validateFaultCommand } = loadSchemas();
const telemetryParser = new TelemetryParser(validateTelemetryPacket);
const telemetryStore = new TelemetryStore(config.telemetry.historyDepth);
const faultState = new FaultState(config.faultInjection.queueDepth);
const runtimeSimulationEngine = new RuntimeSimulationEngine({ eventBus, telemetryStore });

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'spacecraft-telemetry-gateway',
    telemetryStats: telemetryStore.getStats(),
    wsClients: wsManager.clients.size
  });
});

app.use('/api/telemetry', createTelemetryRoutes({
  eventBus,
  telemetryParser,
  telemetryStore
}));

app.use('/api/faults', createFaultInjectionRoutes({
  validateFaultCommand,
  faultState,
  eventBus,
  simulationHooks: SIMULATION_HOOKS,
  simulationEngine: runtimeSimulationEngine
}));

app.use(errorHandler);

const server = http.createServer(app);
const wsManager = setupWebSocketManager({
  server,
  eventBus,
  telemetryStore,
  faultState
});

startTelemetryUdpIngestor({
  eventBus,
  udpPort: config.telemetry.udpPort,
  maxPayloadBytes: config.telemetry.maxPayloadBytes
});

eventBus.on(EVENTS.TELEMETRY_PARSE_ERROR, (error) => {
  logger.warn('Telemetry parse error', error);
});

eventBus.on(EVENTS.FAULT_COMMAND_ACCEPTED, (command) => {
  logger.info('Fault command accepted', {
    commandId: command.commandId,
    faultType: command.faultType,
    subsystem: command.subsystem,
    simulationClass: command.simulation?.testClass || 'none'
  });
});

server.listen(config.app.port, '0.0.0.0', () => {
  logger.info('Telemetry gateway started', {
    port: config.app.port,
    env: config.app.env,
    wsPath: '/ws',
    telemetryUdpPort: config.telemetry.udpPort
  });
});
