'use strict';

const readline = require('readline');
const { spawn } = require('child_process');
const { parseRtosLineToTelemetryPacket } = require('../rtos/rtosLineParser');

const gatewayBase = process.env.GATEWAY_HTTP_URL || 'http://127.0.0.1:8080';
const simulatorCommand = process.env.RTOS_SIM_COMMAND || '';

async function forwardPacket(packet) {
  const response = await fetch(`${gatewayBase.replace(/\/$/, '')}/api/telemetry/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(packet)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gateway ingest failed (${response.status}): ${text}`);
  }
}

function streamLines(input, sourceLabel) {
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    try {
      const packet = parseRtosLineToTelemetryPacket(trimmed);
      await forwardPacket(packet);
      console.log(`[rtos-bridge] forwarded packet event=${packet.event} subsystem=${packet.subsystem} severity=${packet.severity} source=${sourceLabel}`);
    } catch (error) {
      console.warn(`[rtos-bridge] skipped line source=${sourceLabel}: ${error.message}`);
    }
  });

  rl.on('close', () => {
    console.log(`[rtos-bridge] input closed source=${sourceLabel}`);
  });
}

function runFromCommand(command) {
  const child = spawn(command, {
    shell: true,
    stdio: ['ignore', 'pipe', 'inherit']
  });

  streamLines(child.stdout, 'rtos-simulator-process');

  child.on('exit', (code) => {
    console.log(`[rtos-bridge] simulator process exited code=${code}`);
    process.exit(code || 0);
  });
}

function main() {
  if (simulatorCommand) {
    console.log(`[rtos-bridge] starting simulator command: ${simulatorCommand}`);
    runFromCommand(simulatorCommand);
    return;
  }

  console.log('[rtos-bridge] no RTOS_SIM_COMMAND provided; reading RTOS JSON lines from stdin');
  streamLines(process.stdin, 'stdin');
}

main();
