# Development Setup

## Prerequisites

- **Node.js:** v18 or higher (v20 recommended)
- **npm:** v9 or higher (comes with Node.js)

## Installation

```bash
# Clone the repository (if not already cloned)
git clone <repo-url>
cd bomberroyal

# Install all dependencies (root, client, server, shared)
npm install
```

This single command installs dependencies for all workspaces thanks to npm workspaces configuration.

## Running Locally

### Quick Start (Recommended)

```bash
# Start both server and client with hot reload
npm run dev
```

This runs both the server and client concurrently:
- **Client:** http://localhost:5173 (Vite dev server)
- **Server:** http://localhost:3001 (Express + Socket.io)

### Running Separately

If you need to run server and client in separate terminals:

```bash
# Terminal 1: Start server
npm run dev:server

# Terminal 2: Start client
npm run dev:client
```

## Testing Multiplayer Locally

1. Open http://localhost:5173 in your browser
2. Enter a display name and click "Create Room"
3. Copy the 6-character room code
4. Open a second browser window (or incognito)
5. Enter a different display name and paste the room code
6. Both players should appear in the lobby
7. Host clicks "Start Game" when all players are ready

### Testing with Bots

1. Create a room
2. Use the bot controls in the lobby:
   - "+1 Bot" adds one bot
   - "Fill Bots" adds bots to reach 4 players
   - "Remove Bots" removes all bots
3. Start the game

## Project Structure

```
bomberroyal/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── App.tsx         # Main router
│   │   │   ├── Home.tsx        # Create/join room
│   │   │   ├── Lobby.tsx       # Waiting room
│   │   │   ├── Game.tsx        # Game container
│   │   │   ├── Grid.tsx        # Board renderer
│   │   │   ├── PowerUpModal.tsx # Ability choice
│   │   │   └── GameOver.tsx    # Results screen
│   │   ├── hooks/
│   │   │   ├── useSocket.ts    # Socket.io + state
│   │   │   └── useInput.ts     # Keyboard handling
│   │   └── main.tsx            # Entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts          # Vite + proxy config
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── index.ts            # Express + Socket.io setup
│   │   ├── rooms.ts            # Room management
│   │   ├── socket/
│   │   │   └── handlers.ts     # Socket event handlers
│   │   ├── game/
│   │   │   ├── GameLoop.ts     # 20 tick/sec loop
│   │   │   ├── Grid.ts         # Grid generation
│   │   │   ├── Bomb.ts         # Bombs & explosions
│   │   │   ├── PowerUp.ts      # Power-up drops
│   │   │   ├── FogOfWar.ts     # Visibility
│   │   │   └── ShrinkZone.ts   # BR zone
│   │   ├── abilities/
│   │   │   ├── BaseAbility.ts      # Abstract base
│   │   │   ├── AbilityRegistry.ts  # Registry singleton
│   │   │   └── *Ability.ts         # 9 ability files
│   │   └── ai/
│   │       ├── BotManager.ts       # Bot lifecycle
│   │       ├── BotCore.ts          # Danger analysis
│   │       ├── BotTypes.ts         # Type definitions
│   │       ├── Pathfinding.ts      # A* wrapper
│   │       └── personalities/      # 3 personality files
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                 # Shared TypeScript
│   ├── src/
│   │   ├── types.ts            # All interfaces
│   │   ├── constants.ts        # Game config
│   │   └── index.ts            # Exports
│   ├── package.json
│   └── tsconfig.json
│
├── Assets/                 # Game assets (sprites)
├── docs/                   # Developer docs
├── game-docs/              # Player docs
├── package.json            # Root workspace config
├── tsconfig.base.json      # Base TS config
├── CLAUDE.md               # AI session context
├── CHANGELOG.md            # Version history
├── CONTRIBUTING.md         # How to contribute
└── README.md               # Project overview
```

## Build Commands

```bash
# Build all packages (shared → server → client)
npm run build

# Build individual packages
npm run build --workspace=shared
npm run build --workspace=server
npm run build --workspace=client
```

## Environment Variables

**None required for local development.**

The client is configured to proxy API calls to the server automatically via `vite.config.ts`:

```typescript
proxy: {
  '/api': 'http://localhost:3001',
  '/socket.io': {
    target: 'http://localhost:3001',
    ws: true
  }
}
```

For production, you'll need to configure:
- `PORT` - Server port (default: 3001)
- Client build will need the correct server URL

## Common Development Tasks

### Adding a New Ability

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-new-ability)

### Adding a New Bot Personality

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-new-bot-personality)

### Modifying Game Constants

Edit `shared/src/constants.ts` - changes affect both client and server after rebuild.

Key constants:
- `DEFAULT_GRID_WIDTH/HEIGHT` - Grid dimensions
- `DEFAULT_FOG_RADIUS` - Starting visibility
- `BOMB_FUSE_TIME` - Default bomb timer
- `POWER_UP_DROP_CHANCE` - Drop rate from blocks
- `SHRINK_START_DELAY` - Time before zone shrinks
- `TICK_INTERVAL` - Game loop speed (50ms = 20 ticks/sec)

## Common Issues

### "Cannot find module '@bomberroyal/shared'"

The shared package needs to be built first:

```bash
npm run build --workspace=shared
```

Or rebuild everything:

```bash
npm run build
```

### Port Already in Use

If port 3001 or 5173 is already in use:

1. Find and kill the process using the port
2. Or modify the port in the respective config files

### TypeScript Errors After Changes

After modifying shared types:

```bash
# Rebuild shared package
npm run build --workspace=shared

# Restart dev servers
npm run dev
```

### Socket Connection Failed

1. Ensure the server is running (`npm run dev:server`)
2. Check browser console for CORS errors
3. Verify the Vite proxy configuration in `client/vite.config.ts`

## Code Style

- TypeScript strict mode enabled
- No unused locals/parameters (enforced by tsconfig)
- Functional React components with hooks
- Server-side game logic, client receives fog-filtered state
- Socket.io for real-time communication

## Debugging

### Server Logs

The server logs important events:
- Room creation/joining
- Game start/end
- Bot decision errors (if any)

### Client State

Use React DevTools to inspect:
- `useSocket` hook state
- Room/game state updates

### Network Inspection

Use browser DevTools Network tab:
- Filter by "WS" for WebSocket frames
- See all Socket.io events in real-time
