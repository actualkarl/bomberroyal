import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@bomberroyal/shared';
import { createRoom, getRoomInfo } from './rooms.js';
import { setupSocketHandlers } from './socket/handlers.js';

// ES module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Socket.io with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: isProduction
      ? true  // Same origin in production
      : ['http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: isProduction
    ? true
    : ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
}));
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

// Serve static files in production
if (isProduction) {
  const clientDistPath = path.join(__dirname, '../../client/dist');

  console.log('__dirname:', __dirname);
  console.log('clientDistPath:', clientDistPath);

  // Check if client dist exists
  import('fs').then(fs => {
    if (fs.existsSync(clientDistPath)) {
      console.log('Client dist folder EXISTS');
      console.log('Contents:', fs.readdirSync(clientDistPath));
    } else {
      console.log('Client dist folder NOT FOUND');
    }
  });

  // Serve static assets
  app.use(express.static(clientDistPath));

  // SPA fallback - all non-API routes serve index.html
  app.get('*', (req, res, next) => {
    // Skip API and socket.io routes
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (isProduction) {
    console.log('Production mode: serving static files from client/dist');
  }
});
