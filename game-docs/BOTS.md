# Bot Personalities Guide

Bomberman Battle Royale features 3 distinct AI bot personalities. Each has unique behaviors and play styles that create different challenges.

## Overview

All bots share core survival behaviors:
- **Flee from danger** - Avoid bomb blast zones
- **Collect power-ups** - Grab ability upgrades
- **Place bombs strategically** - Ensure escape routes exist

What makes each bot unique is their priorities and aggression levels.

---

## Blitz (The Speedster)

**Philosophy:** *"Gotta go fast."*

Blitz is an aggressive hunter who constantly moves and attacks. Speed and power-ups are their priority.

### Behavior Priorities

1. **Collect ANY power-up** - Greedy collection, will path toward any visible power-up
2. **Hunt players** - Aggressively chases the weakest player
3. **Drop bombs when close** - Places bombs when within 3 tiles of a target
4. **Destroy blocks** - Constantly bombing to create paths and find more power-ups
5. **Never stop moving** - Even when idle, Blitz wanders randomly

### Strengths

- Very active and engaging to fight
- Quickly accumulates power-ups
- Applies constant pressure
- Good at chasing wounded players

### Weaknesses

- Predictable chase patterns
- Can overextend into dangerous situations
- May trap itself with aggressive bombing

### How to Beat Blitz

- Use line of sight to hide in fog
- Set traps at chokepoints
- Let Blitz overcommit, then counter-attack
- Collect power-ups before Blitz reaches them

---

## Demoman (The Mad Bomber)

**Philosophy:** *"More explosions = more fun."*

Demoman lives to bomb everything in sight. Blocks, players, it doesn't matter - if it can be exploded, it will be.

### Behavior Priorities

1. **Collect ANY power-up** - Greedy power-up hunting
2. **Bomb everything** - Places bombs near blocks AND players
3. **Hunt players aggressively** - Chases enemies to bomb them
4. **Destroy all blocks** - Actively seeks destructible blocks to explode
5. **Wander when idle** - Always looking for the next target

### Strengths

- Clears the map quickly
- Creates lots of chain reaction opportunities
- Generates many power-up drops
- High kill potential

### Weaknesses

- Creates chaotic situations that can backfire
- Burns through bombs quickly
- Less precise than other bots

### How to Beat Demoman

- Stay out of blast radius
- Let Demoman clear blocks, then steal power-ups
- Use Demoman's chaos against them
- Bait them into bombing themselves

---

## Rat (The Opportunist)

**Philosophy:** *"Collect everything, avoid confrontation, strike when safe."*

Rat focuses on gathering power-ups while avoiding direct fights. They attack when the opponent is distracted or weak.

### Behavior Priorities

1. **Defensive bombs** - If a player gets within 3 tiles, drops a bomb and flees
2. **Aggressively collect power-ups** - Primary goal is stacking abilities
3. **Destroy blocks** - Looking for more power-up drops
4. **Avoid confrontation** - Steers away from nearby players
5. **Opportunistic attacks** - Strikes at distracted or weakened targets
6. **Wander and explore** - Always moving to find loot

### Strengths

- Accumulates power-ups efficiently
- Difficult to corner
- Survives longer than aggressive bots
- Dangerous in late game when fully powered

### Weaknesses

- Less aggressive early game
- May lose power-up races to faster bots
- Predictable flee patterns

### How to Beat Rat

- Pressure them early before they power up
- Cut off escape routes
- Steal power-ups they're pathing toward
- Catch them while they're bombing blocks

---

## Bot Technical Details

### Decision Making

- Bots make decisions every **100ms** (10 decisions/second)
- Uses **A* pathfinding** to navigate around obstacles and dangers
- Calculates **danger tiles** (bomb blast zones) to avoid
- Requires at least **1 escape route** before placing bombs

### Danger Awareness

Bots calculate danger zones based on:
- Active bombs and their blast radius
- Chain reaction potential
- Shrink zone boundaries

### Adding Bots

In the lobby (host only):
- **+1 Bot** - Adds a single bot with random personality
- **Fill Bots** - Fills remaining slots to reach 4 players
- **Remove Bots** - Removes all bots from lobby

Bot personalities rotate: Blitz, Demoman, Rat, Blitz...

---

## Difficulty Comparison

| Bot | Aggression | Power-up Focus | Survival | Overall Difficulty |
|-----|------------|----------------|----------|-------------------|
| Blitz | High | High | Medium | Medium |
| Demoman | Very High | High | Low | Medium |
| Rat | Low | Very High | High | Medium-Hard |

All bots are designed to be challenging but beatable. They make mistakes and can be outplayed with good positioning and timing.

---

## See Also

- [HOW-TO-PLAY.md](HOW-TO-PLAY.md) - Controls and basic gameplay
- [ABILITIES.md](ABILITIES.md) - Ability descriptions and strategies
