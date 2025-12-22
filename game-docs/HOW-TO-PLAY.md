# How to Play Bomberman Battle Royale

## Getting Started

### Create or Join a Game

1. **Create a Room** - Click "Create Room" to start a new game lobby
2. **Join a Room** - Enter a 6-character room code and click "Join"
3. Enter your display name (max 20 characters)

### Lobby

- Wait for other players to join (2-4 players total)
- Click **Ready** when you're prepared to start
- Host can add bots using **+1 Bot** or **Fill Bots** buttons
- Game starts when all players are ready

---

## Controls

### Movement

| Key | Action |
|-----|--------|
| W / Up Arrow | Move up |
| S / Down Arrow | Move down |
| A / Left Arrow | Move left |
| D / Right Arrow | Move right |

Movement has a 100ms throttle to prevent instant spam.

### Actions

| Key | Action |
|-----|--------|
| Spacebar | Place bomb / Stop sliding bomb (Kick Level 3) / Brake (Speed Level 3) |
| E or Q | Remote detonate bombs (requires Remote Detonate ability) |

---

## Game Mechanics

### Bombs

- You start with **1 bomb** at a time
- Bombs explode after **3 seconds** (modifiable with Quick Fuse)
- Explosions spread in a **cross pattern** (+)
- Explosions are blocked by indestructible walls
- Bombs can trigger **chain reactions** with other bombs

### Destructible Blocks

- Brown blocks can be destroyed by explosions
- Destroyed blocks have a **30% chance** to drop a power-up
- Destroy blocks to create paths and collect power-ups

### Death

- Getting hit by an explosion kills you (unless you have a Shield)
- Standing in the death zone (shrunk area) kills you instantly
- Last player standing wins!

---

## Power-Up System

When you walk over a power-up, a **choice menu** appears with 3 random ability upgrades:

1. **Choose wisely** - Each upgrade has levels (1-3)
2. **Stacking** - Most abilities can be upgraded multiple times
3. **Strategy** - Build your playstyle by focusing on certain abilities

The game continues while you make your choice, so decide quickly!

---

## Fog of War

- You can only see **5 tiles** around you by default
- Walls block your vision (line of sight)
- Areas you've explored appear dimmed but visible
- **Hidden in fog:**
  - Other players
  - Enemy bombs
  - Power-ups
- **Always visible:**
  - Your own bombs
  - Explosions (when they happen)
  - Shrink zone boundary
- Enemy bombs become visible in their **last second** before exploding

---

## Battle Royale Shrink Zone

The arena shrinks over time to force action:

| Time | Event |
|------|-------|
| 0-60 seconds | Grace period (no shrinking) |
| Every 10 seconds | Zone shrinks by 1 tile from all edges |

- The **red zone** is instant death
- Shields do NOT protect from the death zone
- Stay inside the safe area!

---

## Winning the Game

- Be the **last player standing**
- If all remaining players die simultaneously, it's a draw
- After the game, view stats: kills, blocks destroyed, power-ups collected

### Tips for Victory

1. **Collect power-ups early** - More abilities = more options
2. **Watch your escape routes** - Don't trap yourself with your own bomb
3. **Use fog to your advantage** - Ambush players who can't see you
4. **Stay near the center** - Avoid getting caught by the shrinking zone
5. **Learn ability synergies** - Bomb Kick + Remote Detonate is powerful
6. **Listen for audio cues** - Bomb ticking sounds warn of nearby danger

---

## Quick Reference

| Default Values | |
|----------------|---|
| Starting bombs | 1 |
| Starting blast radius | 2 tiles |
| Fog visibility | 5 tiles |
| Bomb fuse time | 3 seconds |
| Shrink starts at | 60 seconds |
| Max players | 4 |

---

## See Also

- [ABILITIES.md](ABILITIES.md) - Detailed ability descriptions
- [BOTS.md](BOTS.md) - Bot personality behaviors
