'use strict';

const DEFAULT_GATEWAY = process.env.GATEWAY_HTTP_URL || 'http://localhost:8080';

function parseArgs(argv) {
  const args = {
    hook: argv[2] || 'simulate_temperature_spike',
    intensity: undefined,
    durationMs: undefined,
    reason: undefined,
    subsystem: undefined,
    host: DEFAULT_GATEWAY
  };

  for (let i = 3; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.replace(/^--/, '');
    const value = argv[i + 1];

    if (['intensity', 'durationMs'].includes(key)) {
      args[key] = Number(value);
      i += 1;
      continue;
    }

    if (['reason', 'subsystem', 'host'].includes(key)) {
      args[key] = value;
      i += 1;
      continue;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const payload = {
    hook: args.hook
  };

  if (Number.isFinite(args.intensity)) payload.intensity = args.intensity;
  if (Number.isFinite(args.durationMs)) payload.durationMs = args.durationMs;
  if (typeof args.reason === 'string') payload.reason = args.reason;
  if (typeof args.subsystem === 'string') payload.subsystem = args.subsystem;

  const response = await fetch(`${args.host.replace(/\/$/, '')}/api/faults/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('[simulate-fault] request failed', JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log('[simulate-fault] accepted');
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error('[simulate-fault] error', error.message);
  process.exit(1);
});
