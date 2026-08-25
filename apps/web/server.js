import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer } from "ws";
import { auth } from "./src/lib/auth.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port, dir: import.meta.dirname });
const handle = app.getRequestHandler();

if (!globalThis.__wsClients) {
  globalThis.__wsClients = new Map();
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    const { pathname } = parse(request.url || "", true);

    if (pathname === "/ws/notifications") {
      try {
        const reqHeaders = new Headers();
        for (const [key, value] of Object.entries(request.headers)) {
          if (value) {
            if (Array.isArray(value)) {
              value.forEach((v) => reqHeaders.append(key, v));
            } else {
              reqHeaders.set(key, value);
            }
          }
        }

        const session = await auth.api.getSession({ headers: reqHeaders });
        if (!session?.user?.id) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request, session.user.id);
        });
      } catch (err) {
        console.error("WebSocket upgrade auth error:", err);
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      }
    }
  });

  wss.on("connection", (ws, _request, userId) => {
    if (!globalThis.__wsClients.has(userId)) {
      globalThis.__wsClients.set(userId, new Set());
    }
    globalThis.__wsClients.get(userId).add(ws);

    ws.on("close", () => {
      const set = globalThis.__wsClients.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          globalThis.__wsClients.delete(userId);
        }
      }
    });

    ws.send(JSON.stringify({ type: "connected", userId }));
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
