import type { WebSocket } from "ws";

declare global {
  var __wsClients: Map<string, Set<WebSocket>> | undefined;
}

if (!globalThis.__wsClients) {
  globalThis.__wsClients = new Map<string, Set<WebSocket>>();
}

export const wsClients: Map<string, Set<WebSocket>> = globalThis.__wsClients;

export function registerSocket(userId: string, ws: WebSocket) {
  if (!wsClients.has(userId)) {
    wsClients.set(userId, new Set());
  }
  wsClients.get(userId)!.add(ws);
}

export function unregisterSocket(userId: string, ws: WebSocket) {
  const set = wsClients.get(userId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) {
      wsClients.delete(userId);
    }
  }
}

export function broadcastToUser(userId: string, payload: unknown) {
  const set = wsClients.get(userId);
  if (!set || set.size === 0) return;

  const msg = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === 1 /* WebSocket.OPEN */) {
      try {
        ws.send(msg);
      } catch (err) {
        console.error("Failed to send WebSocket message to user:", userId, err);
      }
    }
  }
}
