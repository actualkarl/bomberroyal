# Deployment Guide

## Overview

Bomberman Battle Royale is a monorepo with three packages:
- **shared** - TypeScript types (build artifact only)
- **server** - Node.js Express + Socket.io backend
- **client** - React + Vite frontend

For production deployment, you need to:
1. Build all packages
2. Deploy the server (serves API + WebSocket)
3. Deploy the client (static files)

## Build for Production

```bash
# From project root
npm run build
```

This builds in order:
1. `shared` → `shared/dist/`
2. `server` → `server/dist/`
3. `client` → `client/dist/`

## Deployment Options

### Option 1: Railway (Recommended)

Railway can deploy both server and client from a single repo.

#### Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected

#### Server Deployment

1. Create a new Railway project
2. Add a new service from GitHub
3. Configure as Node.js service
4. Set the following:

**Root Directory:** `server`

**Build Command:**
```bash
cd .. && npm install && npm run build --workspace=shared && npm run build --workspace=server
```

**Start Command:**
```bash
node dist/index.js
```

**Environment Variables:**
```
PORT=3001
NODE_ENV=production
```

#### Client Deployment

1. Add another service to the same project
2. Configure as static site
3. Set the following:

**Root Directory:** `client`

**Build Command:**
```bash
cd .. && npm install && npm run build --workspace=shared && npm run build --workspace=client
```

**Publish Directory:** `dist`

**Environment Variables:**
```
VITE_SERVER_URL=https://your-server.railway.app
```

You'll need to update `client/src/hooks/useSocket.ts` to use this environment variable for the Socket.io connection URL.

### Option 2: Single Server Deployment

Deploy everything on one server that serves both API and static files.

#### Modify Server to Serve Client

Add to `server/src/index.ts`:

```typescript
import path from 'path';
import express from 'express';

// After other middleware, before error handlers
if (process.env.NODE_ENV === 'production') {
  // Serve static files from client build
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}
```

#### Deploy to Platform

**Render:**
1. Create new Web Service
2. Connect GitHub repo
3. Build Command: `npm run build`
4. Start Command: `node server/dist/index.js`
5. Set `NODE_ENV=production`

**Fly.io:**
1. Create `fly.toml` in project root
2. Configure for Node.js
3. Deploy with `fly deploy`

### Option 3: Docker Deployment

TODO: Add Dockerfile and docker-compose configuration

## Production Configuration

### Server Configuration

The server reads these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment mode |

### Client Configuration

For production, update the Socket.io connection in `useSocket.ts`:

```typescript
// Development
const socket = io('http://localhost:3001');

// Production
const socket = io(import.meta.env.VITE_SERVER_URL || window.location.origin);
```

Then set `VITE_SERVER_URL` during build if server is on a different domain.

### CORS Configuration

Update `server/src/index.ts` for production origins:

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://your-client-domain.com']
      : ['http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});
```

## Verifying Deployment

### Health Check

```bash
curl https://your-server-url/health
# Should return: { "status": "ok" }
```

### WebSocket Test

1. Open the client URL
2. Create a room
3. Check browser console for connection errors
4. Room code should appear if successful

### Multiplayer Test

1. Open two browser tabs
2. Create room in first tab
3. Join with code in second tab
4. Both should see each other in lobby

## Monitoring

### Logs to Watch

- Room creation/joining events
- Game start/end events
- Socket connection/disconnection
- Error events

### Memory Considerations

- Rooms are stored in memory
- Each room uses ~100KB during active game
- Inactive rooms timeout after 30 minutes
- Consider memory limits for hosting platform

## Scaling Considerations

**Current Architecture Limitations:**
- Single server only (no horizontal scaling)
- In-memory state (not persistent)
- No database (rooms lost on restart)

**For Production Scale:**
- Add Redis for session state
- Use sticky sessions for Socket.io
- Consider horizontal scaling with Redis adapter

## Rollback

Since there's no database, rollback is simple:
1. Deploy previous version
2. Existing rooms will be lost (restart clears memory)
3. Players will need to create new rooms

## Security Checklist

- [ ] HTTPS enabled on all endpoints
- [ ] CORS configured for production domains only
- [ ] No sensitive data in client bundle
- [ ] Rate limiting on API endpoints (TODO)
- [ ] Input validation on server (implemented)
