# NACHT — 2D Zombies

A top-down pixel-style browser zombie survival prototype.

## Deploy as one website (friends do not download files)

This project serves the website and its WebSocket relay from the same Node service. Players visit one URL; the game automatically connects to that service when they join a room.

### Easiest starter deployment: Render
1. Create a GitHub repository and upload the contents of this folder.
2. Create a free account at https://render.com.
3. In Render choose **New → Web Service**, connect your repository.
4. Set **Build Command** to `npm install`.
5. Set **Start Command** to `npm start`.
6. Choose the Free instance and deploy.
7. Open the `https://...onrender.com` URL Render gives you. Share that URL with friends.
8. Everyone opens the same URL, enters the same room code, and clicks **JOIN ONLINE**.

Render's free web services can spin down after 15 minutes without traffic, so the first connection after idle may take about a minute to wake up. This is suitable for testing, not a guaranteed always-on public game.

## Play locally
Run `npm install`, then `npm start`, then open http://localhost:8080.

## Controls
WASD move · Mouse aim · Left click shoot · R reload · E interact · Space knife · Shift run.

## Multiplayer status
This is an early multiplayer prototype, not production-grade networking. The first player in a room is the host and relays the world snapshot. The simulation is not fully server-authoritative; host migration, robust anti-cheat, reconnect handling, and production synchronization still need work.
