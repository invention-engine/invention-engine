// server/index.js – Phase 6 MMO Backend: Auth + State + WebSockets
'use strict';

const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const cors         = require('cors');
const path         = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRouter   = require('./routes/auth');
const stateRouter  = require('./routes/state');
const { verifyJWT } = require('./middleware/auth');
const { initDB }   = require('./db');

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io setup ─────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] }
});

// Connected players map: socketId → { userId, username, x, y, z, region }
const onlinePlayers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const payload = verifyJWT(token);
    socket.userId   = payload.userId;
    socket.username = payload.username;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[WS] ${socket.username} connected (${socket.id})`);

  // Register player state
  onlinePlayers.set(socket.id, {
    socketId: socket.id,
    userId:   socket.userId,
    username: socket.username,
    x: 0, y: 0, z: 0,
    region: 'Wildlands'
  });

  // Send current online player list to new joiner
  socket.emit('players-snapshot', Array.from(onlinePlayers.values()));

  // Notify others of the new player
  socket.broadcast.emit('player-joined', {
    socketId: socket.id,
    username: socket.username,
    x: 0, y: 0, z: 0,
    region: 'Wildlands'
  });

  // ── player-move: broadcast position update to all others ──────────────────
  socket.on('player-move', ({ x, y, z, region, theta }) => {
    const player = onlinePlayers.get(socket.id);
    if (!player) return;
    Object.assign(player, { x, y, z, region: region || player.region, theta: theta || 0 });
    socket.broadcast.emit('player-move', {
      socketId: socket.id,
      username: socket.username,
      x, y, z, region, theta
    });
  });

  // ── chat message ──────────────────────────────────────────────────────────
  socket.on('chat-message', ({ text }) => {
    if (typeof text !== 'string' || text.trim().length === 0) return;
    const msg = {
      socketId: socket.id,
      username: socket.username,
      text: text.trim().slice(0, 300),
      timestamp: Date.now()
    };
    io.emit('chat-message', msg); // broadcast to all including sender
  });

  // ── disconnection ─────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[WS] ${socket.username} disconnected`);
    onlinePlayers.delete(socket.id);
    io.emit('player-left', { socketId: socket.id });
  });
});

// ─── REST API ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.use('/api/auth',  authRouter);
app.use('/api/state', stateRouter);

app.get('/api/ping', (_req, res) => res.json({ ok: true, time: Date.now() }));

// ─── Bootstrap ───────────────────────────────────────────────────────────────
initDB();
httpServer.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
