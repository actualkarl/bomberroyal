# Changelog

All notable changes to Bomberman Battle Royale.

## [0.4.0] - 2025-12-23 - Ryu SF2 Character Sprites

### Added

**Ryu SF2 Character Sprites**
- Replaced miner sprites with Ryu from Street Fighter 2
- New sprite sheet system: `client/src/rendering/PlayerSpriteSheet.ts`
- 1024x1024 sprite sheet with 4x3 grid layout (256x341 cells)
- Three animation states:
  - Idle: frames 0-3 at 6fps
  - Walk: frames 4-7 at 8fps
  - Action: frames 8-11 at 10fps (used for death/win)
- Bottom-center anchor (0.5, 1.0) for proper baseline alignment
- Per-frame baseline offset system for jitter correction
- Horizontal sprite flipping for left/right movement
- NEAREST scale mode for pixel-perfect rendering
- Graceful fallback to legacy miner sprites if Ryu sheet fails to load

### Technical

- `PlayerSpriteSheet.ts`: Loads and slices sprite sheet into frame textures
- `PixiRenderer.ts`: Updated player creation and animation to use new system
- Maintains backwards compatibility with spectator mode
- Player color tinting still applies to differentiate players

---

## [0.3.1] - 2025-12-23 - Bug Fixes & QoL

### Added

**Power-Up Selection Hotkeys**
- Press A to select left power-up option
- Press W to select middle power-up option
- Press D to select right power-up option
- Hotkey badges displayed on each power-up button
- Updated modal text to show "(or press A / W / D)"

**Death Announcements**
- Prominent death announcements now appear at top-center of screen
- Shows "PlayerX was blown up by PlayerY" or "PlayerX died" (shrink zone, etc.)
- Animated slide-in effect with fade-out after 3 seconds
- Red background with glow effect for high visibility

### Fixed

**Bot AI Not Taking Actions**
- Fixed critical bug where bots would stand still and die instead of playing
- Root cause: `canSafelyPlaceBomb()` was incorrectly treating escape paths through danger zones as invalid
- The function simulated bomb placement but then tried to pathfind while avoiding the simulated danger tiles
- This made it impossible for bots to find valid escape routes since they couldn't path through their own bomb's blast radius
- Fix: Allow pathfinding through danger zones when checking escape routes (bot will move before bomb explodes)

**Bot Power-Up Stats**
- Fixed double-counting of `powerUpsCollected` stat for bots

---

## [0.3.0] - 2025-12-22 - Production Ready

### Added

**Railway Deployment Support**
- Server serves static files in production mode
- Dynamic socket URL (same origin in production, localhost in dev)
- CORS configuration for both environments
- Railway configuration file (railway.json)
- Node.js version specification (.nvmrc)

### Technical

- Client socket connection uses `import.meta.env.PROD` to detect environment
- Server uses `express.static()` to serve client build in production
- SPA fallback route for client-side routing
- Updated build order: shared → client → server (client must build first)
- Added `npm start` script for production

---

## [0.2.1] - 2025-12-22 - Visual Polish & Bug Fixes

### Added

**Map Design Improvements**
- Consistent Bomberman-style terrain textures
  - Green grass for floor/walkable tiles
  - Orange brick for indestructible walls
  - Brown wood for destructible blocks
- Classic map layout with border walls and pillar grid pattern
- No more random texture selection - each tile type uses one consistent texture

**Smooth Fog of War**
- Replaced hard-edged rectangular fog with smooth gradient falloff
- Distance-based alpha calculation from visible cells
- Smoothstep interpolation for natural hazy horizon effect
- Explored cells now render terrain underneath the dim fog overlay (true Starcraft-style)
- Transition zone: fog fades smoothly from 0.5 to 2.5 tiles from visible area

**Asset Preloading**
- Assets now preload in lobby while waiting for players
- Faster game start when countdown begins
- Loading indicator in lobby shows preload status

### Fixed

**Bot AI Safety**
- Bots no longer kill themselves by placing bombs without escape routes
- New `canSafelyPlaceBomb()` function simulates bomb blast and verifies escape path exists
- All 3 bot personalities (Blitz, Demoman, Rat) updated to use safe bomb placement

### Technical

- Added wood.png terrain texture to asset loader
- PixiRenderer.updateBlocks() now accepts both visible and explored cells
- Fog calculation uses Euclidean distance for circular falloff
- New useAssetPreload hook for lobby asset caching

---

## [0.2.0] - 2025-12-22 - Graphics Upgrade

### Added

**PixiJS Rendering Engine**
- Replaced CSS-based grid rendering with PixiJS WebGL renderer
- Sprite-based graphics using Minerman Adventure asset pack
- Layered rendering system (ground, blocks, items, bombs, players, explosions, fog, shrink zone)

**Player Animations**
- 4-directional idle animations
- 4-directional walk animations
- Death animation (plays once when killed)
- Win animation (loops for winner)
- Color tinting for 4 distinct player colors

**Bomb Animations**
- Animated dynamite fuse effect
- Warning state: faster animation + red tint in final second
- Smooth position updates for kicked bombs

**Explosion Effects**
- 8-frame animated explosion sprites
- Explosions render on all affected cells (cross pattern)
- Screen shake triggered on every explosion

**Visual Effects**
- Randomized ground tile variants for visual variety
- Randomized destructible block variants (wooden crates)
- Multiple wall texture variants for indestructible blocks
- Colored circle icons for power-ups (color-coded by type)
- Fog of war overlay (black = unseen, grey = explored)
- Pulsing shrink zone overlay with danger/warning colors

**Spectator Mode**
- Activated when player dies during gameplay
- Scroll wheel zoom (0.3x to 1.0x)
- Click and drag panning
- Fog of war removed for full map visibility

### Changed

- Game tile size increased from 40px to 64px (sprites scaled 2x from 32px)
- useInput hook now exposes currentDirection and isMoving for animation sync

### Technical

- Added PixiJS 8.x dependency
- New rendering module: `client/src/rendering/`
  - AssetLoader.ts: Sprite sheet loading and frame extraction
  - PixiRenderer.ts: Main rendering orchestration
  - SpectatorCamera.ts: Dead player camera controls
  - ScreenShake.ts: Explosion screen shake effect
- Assets copied to `client/public/assets/` for serving
- PixiGrid component replaces Grid component

---

## [0.1.0] - 2025-12-22 - MVP Alpha

### Added

**Core Gameplay**
- Room creation with 6-character alphanumeric codes
- Room joining via code entry
- Lobby system with ready states
- 15x13 grid with spawn safe zones (4 corners)
- WASD/Arrow key movement with 100ms throttle
- Server-side movement validation and collision detection
- Bomb placement with Spacebar (250ms cooldown)
- 3-second bomb fuse timer (upgradeable with Quick Fuse)
- Cross-pattern explosion spread
- Chain reactions (bombs trigger adjacent bombs)
- Destructible block destruction (30% power-up drop chance)
- Player death on explosion contact
- Kill credit tracking for stats

**Ability System (9 abilities)**
- Bomb Count: +1 max bombs per level (up to 4)
- Blast Radius: +1 tile per level (up to 4)
- Bomb Kick: Kick bombs 1/2/unlimited tiles
- Remote Detonate: Detonate own bombs / any bomb in line of sight
- Speed: +15% per level (up to +45%)
- Shield: Survive one hit (consumed on use)
- Piercing Bomb: Explosions pass through destructible blocks
- Eagle Eye: +3 fog radius per level (up to +6)
- Quick Fuse: -500ms per level (minimum 1500ms)

**Roguelike Power-Up System**
- Power-ups spawn from destroyed blocks (30% chance)
- Choice UI presents 3 random ability options
- Only upgradeable abilities shown (maxed out = not offered)
- Stacking mechanics for incremental abilities

**Fog of War**
- 5-tile default visibility radius
- Line-of-sight blocking (walls interrupt vision)
- Starcraft-style memory (explored cells dimmed but visible)
- Bomb visibility: hidden → audio range → warning → exploding
- All explosions visible regardless of fog

**Battle Royale Zone**
- 60-second grace period before shrinking
- Zone shrinks every 10 seconds
- Shrinks 1 cell per edge simultaneously
- Instant death in shrink zone (no shield protection)
- Visual red border indicating danger zone

**AI Bot System**
- 3 personalities: Blitz, Demoman, Rat
- A* pathfinding using `pathfinding` library
- Danger zone awareness and fleeing
- Power-up collection behavior
- Player hunting/avoidance based on personality
- 100ms decision throttle (10 decisions/second)
- Bot management in lobby (add/remove)

**UI Components**
- Home screen (create/join room)
- Lobby with player list and ready states
- Game board with CSS-based rendering
- Power-up choice modal
- Game over screen with stats table

**Audio System (Backend Only)**
- Audio event broadcasting infrastructure
- Event types: bomb_placed, bomb_tick, bomb_warning, explosion, player_death, powerup_collect
- Position and direction data for stereo panning

### Technical

- Monorepo with npm workspaces (client/server/shared)
- React 18 with TypeScript and Vite
- Node.js with Express and Socket.io
- 20 ticks/second server game loop
- Fog-filtered state broadcast per player
- Shared TypeScript types between client and server

### Known Issues

- Bot behavior may need tuning (recently made more aggressive)
- Not tested in production environment
- Multiplayer not tested over real network
- No reconnection handling for disconnected players
- Graphics are CSS-based (sprite upgrade planned)

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 0.3.0 | 2025-12-22 | Production Ready - Railway deployment configuration |
| 0.2.1 | 2025-12-22 | Visual Polish - Map design, smooth fog, bot AI fixes |
| 0.2.0 | 2025-12-22 | Graphics Upgrade - PixiJS rendering, sprites, animations |
| 0.1.0 | 2025-12-22 | MVP Alpha - Core mechanics, abilities, bots, fog of war |
