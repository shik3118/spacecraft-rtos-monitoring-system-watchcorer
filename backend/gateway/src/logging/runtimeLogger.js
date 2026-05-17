'use strict';

function nowIso() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  const payload = {
    ts: nowIso(),
    level,
    message,
    ...(meta ? { meta } : {})
  };

  const line = JSON.stringify(payload);

  if (level === 'error' || level === 'warn') {
    console.error(line);
    return;
  }

  console.log(line);
}

module.exports = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
  debug: (message, meta) => log('debug', message, meta)
};
