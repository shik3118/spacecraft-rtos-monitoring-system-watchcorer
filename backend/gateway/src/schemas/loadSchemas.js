'use strict';

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

function loadJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function loadSchemas() {
  const schemaDir = path.resolve(__dirname, '..', '..', '..', 'shared_protocol', 'schemas');
  const telemetryPacketSchema = loadJson(path.join(schemaDir, 'telemetry.packet.schema.json'));
  const faultCommandSchema = loadJson(path.join(schemaDir, 'fault.command.schema.json'));

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validateTelemetryPacket = ajv.compile(telemetryPacketSchema);
  const validateFaultCommand = ajv.compile(faultCommandSchema);

  return {
    validateTelemetryPacket,
    validateFaultCommand
  };
}

module.exports = {
  loadSchemas
};
