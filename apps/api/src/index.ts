import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { WebSocketServer, type WebSocket } from "ws";
import { auth } from "./lib/auth.js";
import { registerSocket, unregisterSocket } from "./lib/ws-hub.js";
import { healthRouter } from "./routes/health.js";
import { usersRouter } from "./routes/users.js";
import { notificationsRouter } from "./routes/notifications.js";
import { projectsRouter } from "./routes/projects.js";
import { ticketsRouter } from "./routes/tickets.js";

const app = new Hono();

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
].filter((o): o is string => Boolean(o));

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0] ?? "*";
      return allowedOrigins.includes(origin) ? origin : null;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.use("*", logger());

// Mount better-auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Mount route modules
app.route("/api/health", healthRouter);
app.route("/api/users", usersRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/projects", projectsRouter);
app.route("/api/projects/:id/tickets", ticketsRouter);

const port = parseInt(process.env.PORT || "4000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const server = serve(
  {
    fetch: app.fetch,
    port,
    hostname,
  },
  (info) => {
    console.log(`> Devflow Hono API listening on http://${info.address}:${info.port}`);
  },
);

// Attach native WebSocket server for notifications
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", async (request, socket, head) => {
  try {
    const url = new URL(request.url || "", `http://${request.headers.host || "127.0.0.1"}`);

    if (url.pathname === "/ws/notifications") {
      const headers = new Headers();
      for (const [k, v] of Object.entries(request.headers)) {
        if (v !== undefined) {
          if (Array.isArray(v)) {
            v.forEach((val) => headers.append(k, val));
          } else {
            headers.set(k, String(v));
          }
        }
      }

      const session = await auth.api.getSession({ headers }).catch((err) => {
        console.error("WebSocket auth error:", err);
        return null;
      });

      const userId = session?.user?.id;
      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        registerSocket(userId, ws);

        ws.on("error", (err) => {
          console.error(`WebSocket error for user ${userId}:`, err);
        });

        ws.on("close", () => {
          unregisterSocket(userId, ws);
        });

        ws.send(JSON.stringify({ type: "connected", userId }));
      });
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
    }
  } catch (err) {
    console.error("WebSocket upgrade unhandled error:", err);
    socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
    socket.destroy();
  }
});
