// Serves the game website and its WebSocket multiplayer relay on one port.
const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = path.normalize(path.join(ROOT, requested));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    const ext = path.extname(file);
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
const rooms = new Map();
function send(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function roomPlayers(room) {
  const peers = rooms.get(room);
  return Object.fromEntries([...peers].map(([id, p]) => [id, p.player]));
}
function broadcast(room, data, except) {
  const peers = rooms.get(room); if (!peers) return;
  for (const { ws } of peers.values()) if (ws !== except) send(ws, data);
}
wss.on("connection", ws => {
  ws.on("message", raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === "join") {
      const room = String(m.room || "NACHT").slice(0, 12);
      if (!rooms.has(room)) rooms.set(room, new Map());
      const peers = rooms.get(room);
      ws.room = room; ws.id = String(m.id || Math.random()).slice(0, 20);
      peers.set(ws.id, { ws, player: { x: 470, y: 390, hp: 100, angle: 0 } });
      send(ws, { type: "welcome", host: peers.size === 1, players: roomPlayers(room) });
      broadcast(room, { type: "players", players: roomPlayers(room) }, ws);
      return;
    }
    if (m.type === "state" && ws.room && rooms.has(ws.room)) {
      const peers = rooms.get(ws.room), own = peers.get(ws.id);
      if (!own) return;
      if (m.player) own.player = m.player;
      const players = roomPlayers(ws.room);
      const hostId = peers.keys().next().value;
      if (ws.id === hostId && m.world) broadcast(ws.room, { type: "state", players, world: m.world });
      else broadcast(ws.room, { type: "state", players }, ws);
    }
  });
  ws.on("close", () => {
    if (!ws.room || !rooms.has(ws.room)) return;
    const peers = rooms.get(ws.room); peers.delete(ws.id);
    if (!peers.size) rooms.delete(ws.room);
    else broadcast(ws.room, { type: "players", players: roomPlayers(ws.room) });
  });
});
server.listen(PORT, () => console.log(`Nacht website + multiplayer listening on ${PORT}`));
