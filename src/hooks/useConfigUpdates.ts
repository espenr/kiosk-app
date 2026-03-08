/**
 * React hook for Server-Sent Events (SSE) config updates
 *
 * Establishes a persistent SSE connection to receive instant config update
 * notifications from the server. Automatically reconnects on failure with
 * exponential backoff.
 */

import { useEffect, useState, useRef } from 'react';

interface ConfigUpdateEvent {
  type: 'config-updated';
  timestamp: number;
}

interface UseConfigUpdatesOptions {
  onUpdate: (timestamp: number) => void;
  enabled?: boolean; // Allow conditional enabling (e.g., only on dashboard)
}

interface UseConfigUpdatesResult {
  connected: boolean;
}

const MAX_BACKOFF_MS = 10000; // Max 10 seconds between reconnects

export function useConfigUpdates({
  onUpdate,
  enabled = true,
}: UseConfigUpdatesOptions): UseConfigUpdatesResult {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const backoffDelayRef = useRef(1000); // Start with 1 second
  const onUpdateRef = useRef(onUpdate);

  // Keep onUpdateRef in sync without triggering reconnections
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) {
      console.log('[ConfigUpdates] SSE disabled');
      return;
    }

    const connect = () => {
      try {
        // Close existing connection if any
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        console.log('[ConfigUpdates] Connecting to SSE...');
        const eventSource = new EventSource('/api/config/updates');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[ConfigUpdates] SSE connected');
          setConnected(true);
          backoffDelayRef.current = 1000; // Reset backoff on successful connect
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as ConfigUpdateEvent;
            if (data.type === 'config-updated') {
              console.log('[ConfigUpdates] Received update notification', data.timestamp);
              onUpdateRef.current(data.timestamp);
            }
          } catch (err) {
            console.error('[ConfigUpdates] Failed to parse message:', err);
          }
        };

        eventSource.onerror = () => {
          console.error('[ConfigUpdates] SSE connection error');
          setConnected(false);
          eventSource.close();

          // Reconnect with exponential backoff
          const delay = Math.min(backoffDelayRef.current, MAX_BACKOFF_MS);
          console.log(`[ConfigUpdates] Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = window.setTimeout(() => {
            backoffDelayRef.current = Math.min(backoffDelayRef.current * 2, MAX_BACKOFF_MS);
            connect();
          }, delay);
        };
      } catch (err) {
        console.error('[ConfigUpdates] Failed to create EventSource:', err);
        setConnected(false);
      }
    };

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled]); // Only depend on 'enabled', not 'onUpdate'

  return { connected };
}
