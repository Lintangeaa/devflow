/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");
const http = require("http");
const { WebSocketServer } = require("ws");
const NextNodeServer = require("next/dist/server/next-server").default;

const dir = path.join(__dirname);
process.env.NODE_ENV = "production";
process.chdir(__dirname);

const currentPort = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";

// Ensure the global WebSocket clients map is initialized
if (!globalThis.__wsClients) {
  globalThis.__wsClients = new Map();
}

// Load Next.js server configuration
const configPath = path.resolve("./.next/required-server-files.json");
const requiredServerFiles = require(configPath);
const nextConfig = requiredServerFiles.config;

const nextServer = new NextNodeServer({
  dir,
  dev: false,
  hostname,
  port: currentPort,
  conf: nextConfig,
  minimalMode: false,
});
const handler = nextServer.getRequestHandler();
const publicDir = path.join(dir, "public");
const nextStaticDir = path.join(dir, ".next", "static");
const publicMimeTypes = {
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function tryServePublicAsset(req, res) {
  const pathname = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`).pathname;
  const isNextStatic = pathname.startsWith("/_next/static/");
  const rootDir = isNextStatic ? nextStaticDir : publicDir;
  const relativePath = decodeURIComponent(isNextStatic ? pathname.slice("/_next/static/".length) : pathname).replace(/^\/+/, "");
  const filePath = path.resolve(rootDir, relativePath);
  if (!filePath.startsWith(`${rootDir}${path.sep}`)) return false;

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;

  res.statusCode = 200;
  res.setHeader("Content-Type", publicMimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  res.setHeader("Content-Length", stat.size);
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && tryServePublicAsset(req, res)) return;
    await handler(req, res);
  } catch (err) {
    console.error("Error handling HTTP request:", req.url, err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", async (request, socket, head) => {
  try {
    const url = new URL(request.url || "", `http://${request.headers.host || "127.0.0.1"}`);

    if (url.pathname === "/ws/notifications") {
      const cookie = request.headers.cookie || "";
      if (!cookie) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      // Verify session via internal auth endpoint
      const authUrl = `http://127.0.0.1:${currentPort}/api/auth/get-session`;
      const authRes = await fetch(authUrl, {
        headers: {
          cookie,
          "x-forwarded-for": (request.headers["x-forwarded-for"] || request.socket.remoteAddress || "").toString(),
          "user-agent": request.headers["user-agent"] || "",
        },
      }).catch((err) => {
        console.error("WebSocket auth verification error:", err);
        return null;
      });

      if (!authRes || !authRes.ok) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const session = await authRes.json().catch(() => null);
      const userId = session?.user?.id;

      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, userId);
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

server.listen(currentPort, hostname, () => {
  console.log(`> Devflow server with WebSocket listening at http://${hostname}:${currentPort}`);
});
