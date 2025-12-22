# Bomberman Battle Royale

A web-based multiplayer Bomberman game with Battle Royale mechanics. Place bombs, destroy blocks, collect power-ups, and be the last player standing as the arena shrinks around you. Features fog of war for tension, a roguelike power-up system with 9 upgradeable abilities, and 3 AI bot personalities for solo practice.

## Quick Start

```bash
# Install all dependencies
npm install

# Start both server and client (development mode)
npm run dev
```

Open http://localhost:5173 in your browser. Create a room and share the 6-character code with friends, or add bots to play solo.

## Documentation Guide

| I want to... | Read this |
|--------------|-----------|
| Understand what this project is | This README |
| Run the game locally | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Deploy to production | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Test features | [docs/TESTING.md](docs/TESTING.md) |
| Add a new ability | [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-new-ability) |
| Add a new bot personality | [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-new-bot-personality) |
| Learn how to play | [game-docs/HOW-TO-PLAY.md](game-docs/HOW-TO-PLAY.md) |
| See all abilities | [game-docs/ABILITIES.md](game-docs/ABILITIES.md) |
| See bot personalities | [game-docs/BOTS.md](game-docs/BOTS.md) |
| Start a Claude Code session | [CLAUDE.md](CLAUDE.md) |
| See version history | [CHANGELOG.md](CHANGELOG.md) |

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Node.js, Express, Socket.io
- **Shared:** TypeScript types and constants
- **Bot AI:** A* Pathfinding (`pathfinding` library)
- **Architecture:** Monorepo with npm workspaces

## Project Structure

```
bomberroyal/
├── client/              # React frontend (Vite)
│   └── src/
│       ├── components/  # React components (App, Game, Grid, etc.)
│       └── hooks/       # Custom hooks (useSocket, useInput)
├── server/              # Node.js backend
│   └── src/
│       ├── game/        # Game loop, grid, bombs, fog of war
│       ├── abilities/   # 9 ability implementations
│       ├── ai/          # Bot AI system with 3 personalities
│       └── socket/      # Socket.io event handlers
├── shared/              # Shared TypeScript types & constants
│   └── src/
│       ├── types.ts     # All interfaces and type definitions
│       └── constants.ts # Game configuration values
├── Assets/              # Game assets (sprites, UI elements)
├── docs/                # Developer documentation
└── game-docs/           # Player-facing documentation
```

## Features

### Core Gameplay
- Classic Bomberman mechanics (bombs, explosions, destructible blocks)
- 4-player multiplayer with room codes
- Server-side validation for fair play

### Battle Royale
- Shrinking safe zone forces players to fight
- 60-second grace period, then shrinks every 10 seconds
- Instant death outside the safe zone

### Fog of War
- Limited visibility (5 tiles by default)
- Line-of-sight blocking by walls
- Starcraft-style memory (explored areas stay visible but dimmed)
- Hidden bombs until the last second

### Roguelike Power-Ups
- 9 abilities with 3 upgrade tiers each
- Random selection of 3 choices when collecting
- Level 3 "Ultimate" abilities add special mechanics

### AI Bots
- 3 distinct personalities: Blitz, Demoman, Rat
- A* pathfinding with danger awareness
- Practice against bots before multiplayer

## Current Status

**Phase:** MVP Alpha (mechanics complete, graphics upgrade next)

See [CHANGELOG.md](CHANGELOG.md) for version history and [CLAUDE.md](CLAUDE.md) for detailed implementation status.

## License

MIT License - See LICENSE file for details.
