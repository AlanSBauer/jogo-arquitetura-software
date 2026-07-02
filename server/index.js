import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { attachWebSocketServer } from "./nativeWebSocket.js";
import { MultiplayerRoomServer } from "./multiplayerServer.js";

const port = Number(process.env.MULTIPLAYER_PORT || 8080);
const roomServer = new MultiplayerRoomServer();
let webProcess = null;
const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, rooms: roomServer.rooms.size }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

attachWebSocketServer(httpServer, (peer) => roomServer.connect(peer));
httpServer.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `[Multiplayer] A porta ${port} ja esta em uso. Encerre a outra instancia do jogo e tente novamente.`,
    );
    webProcess?.kill();
    process.exit(1);
  }

  throw error;
});
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[Multiplayer] WebSocket em ws://localhost:${port}`);
});

if (!process.argv.includes("--server-only")) {
  const npmCliPath =
    process.env.npm_execpath ??
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  webProcess = spawn(process.execPath, [npmCliPath, "run", "dev:web"], {
    stdio: "inherit",
  });
}

function shutdown() {
  webProcess?.kill();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
