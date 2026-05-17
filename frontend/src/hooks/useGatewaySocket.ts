import { useEffect, useMemo, useRef } from 'react';
import { useMissionStore } from '../store/missionStore';
import type { GatewayMessage } from '../types/telemetry';

function resolveWsUrl(): string {
  const raw = import.meta.env.VITE_GATEWAY_WS_URL;
  if (raw) {
    return raw;
  }

  const isHttps = window.location.protocol === 'https:';
  const protocol = isHttps ? 'wss' : 'ws';
  const rawHost = window.location.hostname || 'localhost';
  const host = /^\d+-/.test(rawHost) ? rawHost.replace(/^\d+-/, '8080-') : rawHost;
  return `${protocol}://${host}:8080/ws`;
}

export function useGatewaySocket(): void {
  const wsUrl = useMemo(resolveWsUrl, []);
  const retries = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const connectStart = useRef<number>(0);

  const setConnection = useMissionStore((state) => state.setConnection);
  const ingestTelemetry = useMissionStore((state) => state.ingestTelemetry);
  const hydrateFromSnapshot = useMissionStore((state) => state.hydrateFromSnapshot);
  const addParseError = useMissionStore((state) => state.addParseError);
  const addFaultCommand = useMissionStore((state) => state.addFaultCommand);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let unmounted = false;

    const connect = () => {
      connectStart.current = performance.now();
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        retries.current = 0;
        const latency = Math.round(performance.now() - connectStart.current);
        setConnection(true, latency);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as GatewayMessage;

          if (message.type === 'telemetry.packet') {
            ingestTelemetry(message.data);
            return;
          }

          if (message.type === 'gateway.snapshot') {
            hydrateFromSnapshot(message.data);
            return;
          }

          if (message.type === 'telemetry.parse_error') {
            addParseError(`Gateway parse error (${message.data.source})`);
            return;
          }

          if (message.type === 'fault.command_accepted') {
            addFaultCommand(message.data);
          }
        } catch {
          addParseError('Malformed gateway frame received');
        }
      };

      ws.onclose = () => {
        setConnection(false, null);
        if (unmounted) {
          return;
        }

        retries.current += 1;
        const backoffMs = Math.min(9000, 700 * retries.current);
        timeoutRef.current = window.setTimeout(connect, backoffMs);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      ws?.close();
    };
  }, [
    addFaultCommand,
    addParseError,
    hydrateFromSnapshot,
    ingestTelemetry,
    setConnection,
    wsUrl
  ]);
}
