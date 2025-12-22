# Bomberman Battle Royale - AI Session Context

## Project Status

**Current Phase:** Production Ready
**Last Updated:** 2025-12-23
**Last Session:** Fixed bot AI, added power-up hotkeys, improved death announcements

## What Exists

### Implemented Features
- [x] Room creation/joining with 6-character codes
- [x] Lobby with ready states and bot management
- [x] 15x13 grid with spawn safe zones
- [x] WASD/Arrow movement with server validation
- [x] Bomb placement, fuse timer, explosions
- [x] Chain reactions (bomb triggers bomb)
- [x] Destructible block destruction
- [x] 9 tiered abilities (see game-docs/ABILITIES.md)
- [x] Roguelike power-up choice UI (pick 1 of 3) with A/W/D hotkeys
- [x] Fog of war with line-of-sight blocking
- [x] Starcraft-style cell memory (explored areas dimmed)
- [x] Shrinking battle royale zone
- [x] 3 bot personalities with A* pathfinding
- [x] Audio event system (for future sound implementation)
- [x] Game over screen with stats
- [x] **Death announcements** (animated top-center notifications with killer info)
- [x] **PixiJS sprite-based graphics**
- [x] **Animated player sprites (idle, walk, death, win)**
- [x] **Animated bomb fuse with warning state**
- [x] **Animated explosion effects**
- [x] **Screen shake on explosions**
- [x] **Spectator mode (zoom, pan, fog removal)**
- [x] **Automated testing infrastructure** (see game-docs/TESTING.md)
- [x] **142 unit tests** (Grid, Bomb, Abilities, FogOfWar, ShrinkZone, Bot AI)
- [x] **E2E tests** (Playwright for UI flows)
- [x] **Bot stress testing** (simulated bot games)
- [x] **Consistent Bomberman-style map design** (grass floor, brick walls, wood blocks)
- [x] **Smooth gradient fog of war** (hazy horizon effect, not hard edges)
- [x] **Asset preloading in lobby** (faster game start)
- [x] **Railway deployment ready** (production configuration)

### Not Yet Implemented
- [ ] Sound effects and music
- [ ] Particle effects (beyond explosions)
- [ ] Reconnection handling
- [ ] Mobile touch controls

---

## Deployment

### Railway Deployment

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `bomberroyal` repository
5. Add environment variable: `NODE_ENV` = `production`
6. Deploy

### Local Production Test

```bash
# Build everything
npm run build

# Run in production mode
NODE_ENV=production npm start

# Open http://localhost:3001
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Set to `production` for deployment |
| PORT | 3001 | Server port |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   Home   │  │  Lobby   │  │   Game   │  │ GameOver │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                      ↓                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              useSocket (state management)            │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Socket.io (20 ticks/sec)
┌──────────────────────────────┴──────────────────────────────┐
│                       SERVER (Node.js)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Socket Handlers                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                      ↓                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Game Loop                         │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │    │
│  │  │  Grid   │ │  Bombs  │ │ PowerUp │ │  Shrink │   │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │    │
│  │  ┌─────────┐ ┌─────────────────────────────────┐   │    │
│  │  │FogOfWar │ │         Bot AI System           │   │    │
│  │  └─────────┘ └─────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                      ↓                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Ability Registry (9 abilities)          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                   SHARED (TypeScript types)                  │
│  types.ts - All interfaces   constants.ts - Game config     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files

### Server
| Purpose | Location |
|---------|----------|
| Entry point, REST endpoints | `server/src/index.ts` |
| Room management | `server/src/rooms.ts` |
| Socket event handlers | `server/src/socket/handlers.ts` |
| Main game loop (20 ticks/sec) | `server/src/game/GameLoop.ts` |
| Grid generation, collision | `server/src/game/Grid.ts` |
| Bomb placement, explosions, kicks | `server/src/game/Bomb.ts` |
| Power-up drops, ability upgrades | `server/src/game/PowerUp.ts` |
| Visibility, line-of-sight | `server/src/game/FogOfWar.ts` |
| Battle royale zone shrinking | `server/src/game/ShrinkZone.ts` |
| Ability base class | `server/src/abilities/BaseAbility.ts` |
| Ability singleton registry | `server/src/abilities/AbilityRegistry.ts` |
| Individual abilities (9 files) | `server/src/abilities/*Ability.ts` |
| Bot lifecycle, decisions | `server/src/ai/BotManager.ts` |
| Danger calculation, utilities | `server/src/ai/BotCore.ts` |
| A* pathfinding wrapper | `server/src/ai/Pathfinding.ts` |
| Bot personalities (3 files) | `server/src/ai/personalities/*.ts` |

### Client
| Purpose | Location |
|---------|----------|
| Entry point | `client/src/main.tsx` |
| App router (phase-based) | `client/src/components/App.tsx` |
| Room create/join | `client/src/components/Home.tsx` |
| Waiting room, bot controls | `client/src/components/Lobby.tsx` |
| Main game container | `client/src/components/Game.tsx` |
| **PixiJS game renderer** | `client/src/components/PixiGrid.tsx` |
| Grid renderer (CSS, legacy) | `client/src/components/Grid.tsx` |
| Ability choice modal | `client/src/components/PowerUpModal.tsx` |
| Results screen | `client/src/components/GameOver.tsx` |
| Socket.io + state | `client/src/hooks/useSocket.ts` |
| Keyboard input handling | `client/src/hooks/useInput.ts` |
| Vite config (proxy setup) | `client/vite.config.ts` |

### Client - Rendering Module
| Purpose | Location |
|---------|----------|
| Sprite sheet loading | `client/src/rendering/AssetLoader.ts` |
| Main renderer orchestration | `client/src/rendering/PixiRenderer.ts` |
| Spectator camera controls | `client/src/rendering/SpectatorCamera.ts` |
| Screen shake effect | `client/src/rendering/effects/ScreenShake.ts` |
| Module exports | `client/src/rendering/index.ts` |

### Shared
| Purpose | Location |
|---------|----------|
| All TypeScript interfaces | `shared/src/types.ts` |
| Game constants/config | `shared/src/constants.ts` |

### Tests
| Purpose | Location |
|---------|----------|
| Unit tests (142 tests) | `server/tests/*.test.ts` |
| E2E tests (Playwright) | `client/tests/e2e/*.spec.ts` |
| Bot stress test script | `server/scripts/stress-test.ts` |
| Vitest config | `server/vitest.config.ts` |
| Playwright config | `client/playwright.config.ts` |

---

## Design Philosophy

### Ability System
- Every ability starts at Level 0 (not collected)
- Tiers: Level 1 → Level 2 → Level 3 (Ultimate)
- Ultimate tier adds skill expression OR downside for balance
- Natural counters exist (Kick is countered by Remote Detonate)
- Abilities: `bomb_count`, `blast_radius`, `bomb_kick`, `remote_detonate`, `speed`, `shield`, `piercing_bomb`, `eagle_eye`, `quick_fuse`

### Bot Personalities
- **Blitz:** Speed-focused, aggressive power-up collector, chases weakest player
- **Demoman:** Bomb-focused, destroys blocks constantly, hunts players
- **Rat:** Opportunist, collects power-ups aggressively, flees when threatened

**Bot Safety System:**
- `canSafelyPlaceBomb()` in `Pathfinding.ts` simulates bomb blast and verifies escape path exists
- When checking escape paths, the function does NOT treat the simulated danger zone as unwalkable
  (bot will walk through the blast zone to escape before the bomb explodes)
- All 3 personalities use this safety check before placing bombs

### Fog of War
- Line-of-sight raycasting (Bresenham's algorithm)
- 5-tile default radius (upgradeable with Eagle Eye)
- Starcraft-style memory: explored cells stay visible but dimmed
- **Smooth gradient fog**: distance-based alpha with smoothstep interpolation
- Explored cells render terrain underneath dim overlay (true Starcraft-style)
- Bombs: hidden → audio range (3 tiles) → warning (1 sec) → explosion visible

### Map Design
- **Consistent textures**: grass (floor), brick (indestructible), wood (destructible)
- Classic Bomberman layout: border walls + pillar grid pattern
- 4 corner spawn zones with safe areas (3 tiles each)
- ~70% destructible block coverage for balanced gameplay

### Server Authority
- All game logic runs on server
- Client sends inputs, receives fog-filtered state
- 20 ticks/second (50ms per tick)
- Server validates all actions (movement, bombs, abilities)

### Spectator Mode
**Status:** Fully implemented

**Trigger:** Automatically activates when player dies during gameplay

**Controls:**
- **Scroll wheel:** Zoom in/out (0.3x to 1.0x range)
- **Click + drag:** Pan around the map

**Features:**
- Fog of war is removed (full map visibility)
- Zoom toward mouse cursor position
- Automatically disabled when new game starts

**Files:**
- `SpectatorCamera.ts` - Camera class with zoom/pan controls
- `PixiRenderer.ts` - `enableSpectatorMode()` / `disableSpectatorMode()` methods
- `PixiGrid.tsx` - Triggers spectator mode on player death

---

## How to Extend

### Adding a New Ability
See [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-new-ability) for full guide.

Quick steps:
1. Create `server/src/abilities/NewAbility.ts` extending `BaseAbility`
2. Register in `server/src/abilities/index.ts`
3. Add type to `shared/src/types.ts` (`AbilityId` union)
4. Add constants to `shared/src/constants.ts` if needed
5. Document in `game-docs/ABILITIES.md`

### Adding a New Bot Personality
See [CONTRIBUTING.md](CONTRIBUTING.md#adding-a-new-bot-personality) for full guide.

Quick steps:
1. Create `server/src/ai/personalities/NewPersonality.ts`
2. Implement `BotPersonalityHandler` interface
3. Register in `server/src/ai/BotManager.ts` (`personalityHandlers`)
4. Add type to `shared/src/types.ts` (`BotPersonality` union)
5. Document in `game-docs/BOTS.md`

---

## Next Planned Work

1. **Sound effects** - Implement audio using the existing event system
2. **Particle effects** - Power-up collect particles, death particles
3. **Production deployment** - Railway or similar platform
4. **Mobile touch controls** - Virtual joystick and buttons

---

## Session Instructions

### When Starting a New Session

1. Read this file completely
2. Check [CHANGELOG.md](CHANGELOG.md) for recent changes
3. Run `npm run dev` to start the game locally
4. Test the current state before making changes

### After Completing Work

1. **UPDATE this file** with new features/changes
2. Add entry to [CHANGELOG.md](CHANGELOG.md)
3. Update relevant documentation (ABILITIES.md, BOTS.md, etc.)
4. Run `npm run build` to verify no TypeScript errors

### Common Commands

```bash
# Start development (both client and server)
npm run dev

# Build all packages
npm run build

# Build server only
npm run build --workspace=server

# Build client only
npm run build --workspace=client

# Run unit tests
npm test

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests (requires dev server running)
npm run test:e2e

# Run bot stress test (50 games)
npm run stress-test

# Run overnight stress test (1000 games)
npm run stress-test:overnight
```

---

## Technical Details

### Ports
- Client (Vite): `http://localhost:5173`
- Server (Express): `http://localhost:3001`
- Vite proxies `/api` and `/socket.io` to server

### Dependencies
- Client: React 18, Socket.io-client, Vite, **PixiJS 8.x**
- Server: Express, Socket.io, CORS, Pathfinding
- Shared: TypeScript types only

### Rendering
- **PixiJS WebGL renderer** with 64x64 tile size (sprites scaled 2x from 32x32)
- **Layered rendering:** ground → items → blocks → bombs → players → explosions → shrink → fog
- **Assets:** Minerman Adventure sprite pack in `client/public/assets/`
- **Animation speeds:** idle (0.08), walk (0.15), death (0.12), bomb (0.1/0.3), explosion (0.2)
- **Terrain textures:** grass.png (floor), wall.png (indestructible), wood.png (destructible)
- **Fog rendering:** Smooth gradient using distance-from-visible calculation with smoothstep

### Room Codes
- 6 alphanumeric characters (excludes confusing chars like 0/O, 1/I/L)
- Rooms auto-cleanup after 30 minutes of inactivity
- Max 4 players per room

### Game Loop
- 20 ticks/second (50ms per tick)
- Server maintains authoritative state
- Each client receives personalized fog-filtered view
- Bot AI runs at 100ms decision interval (10 decisions/sec)

---

## Known Issues

- Multiplayer not tested over real network (only localhost)
- No reconnection handling if player disconnects

---

## Original Design Spec

The sections below contain the original project specification for reference.

### Core Loop
4 players spawn on a destructible grid arena → place bombs → destroy blocks and each other → arena shrinks (BR style) → last player standing wins.

### Unique Features
- **Fog of War:** Players can only see a limited radius around themselves
- **Roguelike Power-Up System:** Choose from multiple options when collecting power-ups

### Constraints
- No database (in-memory only)
- No authentication (display names only)
- No persistent stats
- Max 4 players per room
- Single server deployment
- Desktop-first (mobile is stretch goal)

### Visual Style
**Aesthetic:** Neo-retro arcade - pixel art meets neon

**Color Palette:**
- Background: Dark (#1a1a2e)
- Grid lines: Subtle (#2d2d44)
- Destructible blocks: Brown/tan (#8b7355)
- Indestructible blocks: Dark metal/stone (#2d2d44)
- Shrink zone: Ominous red (#4a0e0e)

**Player Colors:**
- Red (#ff4757)
- Blue (#3742fa)
- Green (#2ed573)
- Yellow (#ffa502)
