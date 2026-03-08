/**
 * Server-Sent Events (SSE) utilities for real-time config updates
 *
 * Manages SSE connections and broadcasts config update notifications
 * to all connected dashboard clients.
 */

import { ServerResponse } from 'node:http';

// Track active SSE connections
const sseClients = new Set<ServerResponse>();

/**
 * Add a new SSE client connection
 * Sends initial "connected" message and keeps connection alive
 */
export function addSSEClient(res: ServerResponse): void {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection confirmation
  res.write(': connected\n\n');

  // Add to active clients
  sseClients.add(res);
  console.log(`[SSE] Client connected (total: ${sseClients.size})`);

  // Remove client on disconnect
  res.on('close', () => {
    sseClients.delete(res);
    console.log(`[SSE] Client disconnected (total: ${sseClients.size})`);
  });

  // Keep connection alive with periodic heartbeats (every 30s)
  const heartbeatInterval = setInterval(() => {
    if (sseClients.has(res)) {
      res.write(': heartbeat\n\n');
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000);
}

/**
 * Broadcast config update notification to all connected clients
 * @param timestamp - Unix timestamp (ms) of the config update
 */
export function broadcastConfigUpdate(timestamp: number): void {
  if (sseClients.size === 0) {
    console.log('[SSE] No clients to broadcast to');
    return;
  }

  const event = {
    type: 'config-updated',
    timestamp,
  };

  const data = `data: ${JSON.stringify(event)}\n\n`;

  console.log(`[SSE] Broadcasting config update to ${sseClients.size} client(s)`);

  // Send to all connected clients
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch (err) {
      console.error('[SSE] Failed to send to client:', err);
      sseClients.delete(client);
    }
  }
}

/**
 * Get the number of active SSE clients
 * Useful for monitoring and debugging
 */
export function getSSEClientCount(): number {
  return sseClients.size;
}
