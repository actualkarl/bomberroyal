import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@bomberroyal/shared';
import { createRoom, getRoomInfo } from './rooms.js';
import { setupSocketHandlers } from './socket/handlers.js';

const app = express();
const httpServer = createServer(app);

// Socket.io with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Create room
app.post('/api/rooms', (req, res) => {
  const { displayName } = req.body;

  if (!displayName || typeof displayName !== 'string') {
    res.status(400).json({ error: 'Display name is required' });
    return;
  }

  // Generate a temporary host ID (will be replaced when socket connects)
  const tempHostId = `temp-${Date.now()}`;
  const room = createRoom(tempHostId, displayName.trim().slice(0, 20));

  res.json({
    code: room.code,
    roomId: room.id,
  });
});

// Get room info
app.get('/api/rooms/:code', (req, res) => {
  const info = getRoomInfo(req.params.code);

  if (!info) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  res.json(info);
});

// Setup socket handlers
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
