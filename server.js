// NACHT website + lightweight WebSocket room service.
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = path.resolve(ROOT, '.' + requested);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file);
    const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    res.end(data);
  });
});
const wss = new WebSocket.Server({ server, maxPayload: 64 * 1024 });
const rooms = new Map();
const MAX_PLAYERS = 4;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function send(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function playersOf(room) { return Object.fromEntries([...room.players].map(([id, p]) => [id, p.player])); }
function broadcast(room, data, except = null) { for (const peer of room.players.values()) if (peer.ws !== except) send(peer.ws, data); }
function makeCode() {
  let code;
  do { code = Array.from({length:6}, () => CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join(''); }
  while (rooms.has(code));
  return code;
}
function leaveRoom(ws) {
  const code = ws.roomCode, id = ws.playerId;
  if (!code || !id) return;
  ws.roomCode = null; ws.playerId = null;
  const room = rooms.get(code);
  if (!room) return;
  room.players.delete(id);
  if (room.players.size === 0) { rooms.delete(code); return; }
  if (!room.players.has(room.hostId)) {
    room.hostId = room.players.keys().next().value;
    const newHost = room.players.get(room.hostId);
    send(newHost.ws, { type:'host', host:true, world:room.world || null });
  }
  broadcast(room, { type:'players', players:playersOf(room), hostId:room.hostId });
}

function joinRoom(ws, code, create) {
  if (ws.roomCode) return send(ws, {type:'error', message:'You are already in a room.'});
  if (create) code = makeCode();
  else if (!/^[A-Z0-9]{6}$/.test(code || '')) return send(ws, {type:'error', message:'Enter a valid 6-character room code.'});
  let room = rooms.get(code);
  if (!room && !create) return send(ws, {type:'error', message:'Room not found. Ask the host to create it first.'});
  if (!room) { room = { players:new Map(), hostId:null, world:null }; rooms.set(code, room); }
  if (room.players.size >= MAX_PLAYERS) return send(ws, {type:'error', message:'This room is full (4 players maximum).'});
  const id = 'p' + Math.random().toString(36).slice(2, 10);
  const isHost = room.players.size === 0;
  if (isHost) room.hostId = id;
  const spawnIndex = room.players.size;
  const spawnPoints = [{x:470,y:390},{x:510,y:390},{x:470,y:430},{x:510,y:430}];
  room.players.set(id, { ws, player:{...spawnPoints[spawnIndex], hp:100, angle:0} });
  ws.roomCode = code; ws.playerId = id;
  send(ws, {type:'welcome', room:code, id, host:isHost, hostId:room.hostId, players:playersOf(room), world:room.world});
  broadcast(room, {type:'players', players:playersOf(room), hostId:room.hostId}, ws);
}
wss.on('connection', ws => {
  ws.roomCode = null; ws.playerId = null;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.type !== 'string') return;
    if (m.type === 'create') return joinRoom(ws, '', true);
    if (m.type === 'join') return joinRoom(ws, String(m.room || '').trim().toUpperCase(), false);
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode); if (!room) return;
    const own = room.players.get(ws.playerId); if (!own) return;
    if (m.type === 'action' && m.action === 'shoot') {
      const shooter = own.player;
      const hostPeer = room.players.get(room.hostId);
      if (hostPeer && hostPeer.ws !== ws) send(hostPeer.ws, {type:'playerAction', action:'shoot', player:{x:shooter.x,y:shooter.y,angle:shooter.angle}, damage:Math.max(1,Math.min(250,Number(m.damage)||35))});
      return;
    }
    if (m.type === 'state') {
      if (m.player && Number.isFinite(m.player.x) && Number.isFinite(m.player.y)) {
        own.player = { x:Math.max(16,Math.min(944,m.player.x)), y:Math.max(16,Math.min(584,m.player.y)), hp:Math.max(0,Math.min(100,Number(m.player.hp)||0)), angle:Number(m.player.angle)||0 };
      }
      if (ws.playerId === room.hostId && m.world && typeof m.world === 'object') room.world = m.world;
      const payload = {type:'state', players:playersOf(room), hostId:room.hostId};
      if (ws.playerId === room.hostId && m.world) payload.world = m.world;
      broadcast(room, payload, ws);
      return;
    }
    if (m.type === 'leave') { leaveRoom(ws); return; }
  });
  ws.on('close', () => leaveRoom(ws));
  ws.on('error', () => leaveRoom(ws));
});
server.listen(PORT, () => console.log(`Nacht website + multiplayer listening on ${PORT}`));
