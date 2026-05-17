'use strict';

const express = require('express');
const { EVENTS } = require('../events/eventBus');

function createTelemetryRoutes({ eventBus, telemetryParser, telemetryStore }) {
  const router = express.Router();

  router.post('/ingest', (req, res, next) => {
    try {
      const raw = JSON.stringify(req.body || {});
      eventBus.emit(EVENTS.TELEMETRY_INGESTED, {
        source: 'http',
        payload: raw,
        remote: {
          ip: req.ip
        }
      });

      res.status(202).json({ accepted: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/latest', (req, res) => {
    res.json({ latest: telemetryStore.getLatest() });
  });

  router.get('/history', (req, res) => {
    const limit = Number(req.query.limit || 50);
    res.json({ history: telemetryStore.getHistory(limit) });
  });

  router.get('/stats', (req, res) => {
    res.json({ stats: telemetryStore.getStats() });
  });

  eventBus.on(EVENTS.TELEMETRY_INGESTED, (ingested) => {
    try {
      const packet = telemetryParser.parse(ingested.payload, ingested.source);
      telemetryStore.addPacket(packet);
      eventBus.emit(EVENTS.TELEMETRY_PACKET, packet);
    } catch (err) {
      telemetryStore.incrementParseError();
      eventBus.emit(EVENTS.TELEMETRY_PARSE_ERROR, {
        source: ingested.source,
        remote: ingested.remote,
        message: err.message,
        details: err.details
      });
    }
  });

  return router;
}

module.exports = {
  createTelemetryRoutes
};
