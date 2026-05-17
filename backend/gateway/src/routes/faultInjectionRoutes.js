'use strict';

const express = require('express');
const { EVENTS } = require('../events/eventBus');

function createFaultInjectionRoutes({
  validateFaultCommand,
  faultState,
  eventBus,
  simulationHooks,
  simulationEngine
}) {
  const router = express.Router();

  function acceptFaultCommand(rawCommand) {
    const command = {
      ...rawCommand,
      issuedAt: Date.now(),
      commandId: rawCommand?.commandId || `cmd-${Date.now()}`
    };

    if (!validateFaultCommand(command)) {
      const errors = validateFaultCommand.errors || [];
      eventBus.emit(EVENTS.FAULT_COMMAND_REJECTED, { command, errors });
      return { accepted: false, errors, command };
    }

    faultState.addCommand(command);
    eventBus.emit(EVENTS.FAULT_COMMAND_ACCEPTED, command);
    const simulation = simulationEngine.run(command);

    return {
      accepted: true,
      command,
      simulation
    };
  }

  router.post('/', (req, res) => {
    const result = acceptFaultCommand(req.body || {});

    if (!result.accepted) {
      return res.status(400).json(result);
    }

    return res.status(202).json(result);
  });

  router.post('/simulate', (req, res) => {
    const hookName = String(req.body?.hook || '').trim();
    const hook = simulationHooks[hookName];

    if (!hook) {
      return res.status(400).json({
        accepted: false,
        error: `Unknown simulation hook: ${hookName}`,
        availableHooks: Object.keys(simulationHooks)
      });
    }

    const commandTemplate = hook(req.body || {});
    const result = acceptFaultCommand(commandTemplate);

    if (!result.accepted) {
      return res.status(400).json(result);
    }

    return res.status(202).json({
      ...result,
      hook: hookName
    });
  });

  router.get('/hooks', (req, res) => {
    res.json({ hooks: Object.keys(simulationHooks) });
  });

  router.get('/active-simulations', (req, res) => {
    res.json({ active: simulationEngine.getActiveScenarios() });
  });

  router.get('/recent', (req, res) => {
    const limit = Number(req.query.limit || 20);
    res.json({ recent: faultState.getRecent(limit) });
  });

  return router;
}

module.exports = {
  createFaultInjectionRoutes
};
