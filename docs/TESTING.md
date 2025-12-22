# Testing Checklist

Manual testing checklist for Bomberman Battle Royale.

## Pre-Release Testing

### Connection & Rooms

- [ ] Server starts without errors (`npm run dev:server`)
- [ ] Client starts without errors (`npm run dev:client`)
- [ ] Health endpoint responds (`GET /api/rooms` returns empty or error)
- [ ] Create room returns 6-character code
- [ ] Join room with valid code works
- [ ] Join room with invalid code shows error
- [ ] Player appears in lobby after joining
- [ ] Second player can join same room
- [ ] Player leaving removes them from lobby
- [ ] Room shows correct player count

### Lobby

- [ ] Room code is displayed
- [ ] All connected players are listed
- [ ] Player names display correctly
- [ ] Ready toggle works for current player
- [ ] Ready status visible for all players
- [ ] Host sees "Start Game" button
- [ ] Non-host doesn't see "Start Game" button
- [ ] Start requires all players ready (2+ players)
- [ ] Countdown displays (3, 2, 1)

### Bot Management (Host Only)

- [ ] "+1 Bot" adds a bot to lobby
- [ ] Bot shows correct personality name
- [ ] "Fill Bots" adds bots to reach 4 players
- [ ] "Remove Bots" removes all bots
- [ ] Cannot add more than 3 bots (4 players max)
- [ ] Bots show as ready

### Core Movement

- [ ] W/Up Arrow moves player up
- [ ] S/Down Arrow moves player down
- [ ] A/Left Arrow moves player left
- [ ] D/Right Arrow moves player right
- [ ] Cannot walk through indestructible blocks
- [ ] Cannot walk through destructible blocks
- [ ] Cannot walk off the grid edges
- [ ] Movement has 100ms throttle (no instant spam)

### Bombs & Explosions

- [ ] Spacebar places bomb at player position
- [ ] Bomb appears visually at placed location
- [ ] Cannot place bomb if already at max bombs
- [ ] Bomb explodes after ~3 seconds
- [ ] Explosion spreads in cross pattern (+)
- [ ] Explosion stops at indestructible blocks
- [ ] Explosion destroys destructible blocks
- [ ] Explosion kills players in blast zone
- [ ] Chain reaction: bomb triggers adjacent bomb
- [ ] Kill credit goes to bomb owner
- [ ] Player stats update on kill

### Power-Up System

- [ ] Destroyed blocks sometimes drop power-ups (~30%)
- [ ] Walking over power-up triggers choice modal
- [ ] Modal shows 3 ability options
- [ ] Clicking an option applies upgrade
- [ ] Modal closes after selection
- [ ] Player stats show power-up collected
- [ ] Power-up disappears from grid after collection

### Abilities

#### Bomb Count
- [ ] Level 1: Can place 2 bombs
- [ ] Level 2: Can place 3 bombs
- [ ] Level 3: Can place 4 bombs

#### Blast Radius
- [ ] Level 1: Explosion reaches 2 tiles
- [ ] Level 2: Explosion reaches 3 tiles
- [ ] Level 3: Explosion reaches 4 tiles

#### Bomb Kick
- [ ] Level 1: Walk into bomb kicks it 1 tile
- [ ] Level 2: Walk into bomb kicks it 2 tiles
- [ ] Level 3: Bomb slides until hitting obstacle
- [ ] Level 3: Spacebar stops kicked bomb mid-slide

#### Remote Detonate
- [ ] Level 1: E/Q detonates own bombs immediately
- [ ] Level 2: Same as Level 1 (increased range future)
- [ ] Level 3: Can detonate ANY bomb in line of sight
- [ ] Level 3: Blocked by walls (line of sight check)

#### Speed
- [ ] Level 1: Movement noticeably faster
- [ ] Level 2: Movement faster, slight slide on stop
- [ ] Level 3: Maximum speed, pronounced slide
- [ ] Level 3: Spacebar brakes/stops sliding (TODO: verify)

#### Shield
- [ ] Level 1: Survive one explosion hit
- [ ] Shield consumed after protecting from hit
- [ ] Second hit kills player normally

#### Piercing Bomb (if available in drops)
- [ ] Explosions pass through destructible blocks
- [ ] Still stopped by indestructible blocks

#### Eagle Eye
- [ ] Level 1: Fog radius increased (+3 tiles)
- [ ] Level 2: Fog radius increased more (+6 tiles)

#### Quick Fuse
- [ ] Level 1: Bombs explode faster (~2.5s)
- [ ] Level 2: Bombs explode faster (~2s)
- [ ] Level 3: Bombs explode very fast (~1.5s)

### Fog of War

- [ ] Cannot see beyond 5 tiles initially
- [ ] Walls block line of sight
- [ ] Previously seen tiles stay visible (dimmed)
- [ ] Other players hidden when out of range
- [ ] Enemy bombs hidden when far away
- [ ] Bombs become visible in final second
- [ ] Explosions visible regardless of fog
- [ ] Power-ups hidden when out of range
- [ ] Shrink zone boundary always visible

### Shrinking Zone

- [ ] No shrinking in first 60 seconds
- [ ] Warning before shrink (visual cue)
- [ ] Zone shrinks from all edges simultaneously
- [ ] Shrunk cells turn red (death zone)
- [ ] Player dies instantly in death zone
- [ ] Death zone ignores shield
- [ ] Zone continues shrinking every 10 seconds

### Game End

- [ ] Game ends when 1 player remains
- [ ] Game ends when all players die (draw)
- [ ] Winner announcement displays
- [ ] Stats table shows kills, blocks, power-ups
- [ ] Host sees "Play Again" button
- [ ] "Play Again" returns to lobby
- [ ] "Leave" returns to home screen

### Bot Behavior

#### All Bots
- [ ] Bots flee from bomb explosions
- [ ] Bots avoid standing in danger zones
- [ ] Bots collect power-ups
- [ ] Bots place bombs to destroy blocks
- [ ] Bots don't get permanently stuck

#### Blitz (Speedster)
- [ ] Prioritizes collecting power-ups
- [ ] Chases other players aggressively
- [ ] Constantly moving

#### Demoman (Bomber)
- [ ] Places bombs frequently
- [ ] Destroys many blocks
- [ ] Hunts players

#### Rat (Opportunist)
- [ ] Collects power-ups actively
- [ ] Flees when players get close
- [ ] Places defensive bombs when threatened

### Multiplayer Sync

- [ ] Both players see same grid state
- [ ] Player positions sync correctly
- [ ] Bomb placements appear for both
- [ ] Explosions visible for both
- [ ] Power-up collection syncs
- [ ] Deaths sync correctly
- [ ] Game over triggers for both

---

## Known Issues

Document any bugs found during testing:

| Issue | Steps to Reproduce | Severity |
|-------|-------------------|----------|
| | | |

---

## Performance Testing

- [ ] Game runs smoothly with 4 players
- [ ] No visible lag during explosions
- [ ] No memory leaks during long sessions
- [ ] Browser doesn't freeze during gameplay

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (latest) - if available

---

## Reporting Bugs

When reporting issues:

1. **Describe the bug** - What happened vs. what should happen
2. **Steps to reproduce** - Exact steps to trigger the bug
3. **Environment** - Browser, OS, screen size
4. **Console errors** - Any errors in browser dev tools
5. **Network issues** - Any failed requests in Network tab
