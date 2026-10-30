# NACHT — 2D Zombies

Browser-based top-down zombie survival prototype.

## Controls
- WASD: move
- Mouse: aim
- Left click: shoot
- R: reload
- E: interact / buy / repair
- Space: knife
- Shift: sprint

## Multiplayer
1. Open the website and click **CREATE ROOM**.
2. Share the six-character room code shown in the room-code field.
3. Your friend enters that code and clicks **JOIN ROOM**.
4. Up to four players can join a room.
5. Click **LEAVE ROOM** to disconnect.

The room server assigns unique player IDs, rejects unknown room codes, prevents duplicate joins on one connection, and transfers host status when the host disconnects. The host relays the shared zombie/world state; guest shots are sent to the host for simulation.

This is still an early multiplayer prototype, not a production-grade authoritative game server. Player health, all weapon actions, purchases, reconnect recovery, and anti-cheat are not fully server-authoritative yet.

## Run locally
```bash
npm install
npm start
```
Then open `http://localhost:8080`.

## Render deployment
- Build command: `npm install`
- Start command: `npm start`
- Root directory: leave blank when these files are at the repository root.
