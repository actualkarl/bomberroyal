# Contributing to Bomberman Battle Royale

## Code Structure Overview

The project is a monorepo with three packages:

```
bomberroyal/
├── shared/     # TypeScript types and constants (used by both)
├── server/     # Node.js game server (Express + Socket.io)
└── client/     # React frontend (Vite)
```

All game logic runs on the server. The client receives fog-filtered state and sends input events.

---

## Adding a New Ability

### Ability Design Philosophy

1. **Start at Level 0** - Abilities are not collected by default
2. **3 Tiers** - Level 1 → Level 2 → Level 3 (Ultimate)
3. **Incremental Value** - Each level should feel meaningful
4. **Ultimate Tier** - Level 3 adds skill expression OR has a downside for balance
5. **Natural Counters** - Consider how other abilities interact (e.g., Kick vs Remote Detonate)

### Implementation Steps

#### 1. Add the Ability ID

Edit `shared/src/types.ts`:

```typescript
export type AbilityId =
  | 'bomb_count'
  | 'blast_radius'
  // ... existing abilities
  | 'your_new_ability';  // Add here
```

#### 2. Add Constants (if needed)

Edit `shared/src/constants.ts`:

```typescript
// Add any constants your ability needs
export const YOUR_ABILITY_VALUES = [0, 1, 2, 3];  // Values per level
export const YOUR_ABILITY_MAX_LEVEL = 3;
```

#### 3. Create the Ability Class

Create `server/src/abilities/YourNewAbility.ts`:

```typescript
import { Player, AbilityId } from '@bomberroyal/shared';
import { YOUR_ABILITY_MAX_LEVEL } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier, getAbilityLevel, setAbilityLevel } from './BaseAbility.js';

export class YourNewAbility extends BaseAbility {
  constructor() {
    super();
    this.id = 'your_new_ability' as AbilityId;
    this.name = 'Your New Ability';
    this.description = 'Brief description of what it does';
    this.maxLevel = YOUR_ABILITY_MAX_LEVEL;

    this.tiers = [
      {
        level: 1,
        name: 'Tier 1 Name',
        description: 'What level 1 does',
        effect: '+X something',
      },
      {
        level: 2,
        name: 'Tier 2 Name',
        description: 'What level 2 does',
        effect: '+Y something',
      },
      {
        level: 3,
        name: 'Ultimate Name',
        description: 'What level 3 does (the ultimate tier)',
        effect: 'Ultimate effect',
        downside: 'Optional: any downside for balance',
      },
    ];
  }

  onUpgrade(player: Player, newLevel: number): void {
    // Apply the ability effect to the player
    // Example: player.someProperty = calculateValue(newLevel);
  }

  // Optional: called when ability is consumed (like Shield)
  onLose(player: Player): void {
    // Reset any player properties
  }
}
```

#### 4. Register the Ability

Edit `server/src/abilities/index.ts`:

```typescript
import { YourNewAbility } from './YourNewAbility.js';

// In the registration section:
abilityRegistry.register(new YourNewAbility());
```

#### 5. Add Player Property (if needed)

If your ability modifies the player, add the property to the Player interface.

Edit `shared/src/types.ts`:

```typescript
export interface Player {
  // ... existing properties
  yourNewProperty: number;  // Add if needed
}
```

Update `server/src/rooms.ts` to initialize the property:

```typescript
export function createPlayer(/* ... */): Player {
  return {
    // ... existing properties
    yourNewProperty: 0,  // Default value
  };
}
```

#### 6. Implement Game Logic

If your ability affects game mechanics, update the relevant files:

- `server/src/game/GameLoop.ts` - Main game loop
- `server/src/game/Bomb.ts` - Bomb/explosion mechanics
- `server/src/game/FogOfWar.ts` - Visibility mechanics
- `server/src/socket/handlers.ts` - Input handling

#### 7. Update Documentation

Add your ability to `game-docs/ABILITIES.md`:

```markdown
## Your New Ability

Description of what the ability does.

| Level | Effect |
|-------|--------|
| 0 (default) | Nothing |
| 1 | First upgrade effect |
| 2 | Second upgrade effect |
| 3 (Ultimate) | Ultimate effect |

**Strategy:** Tips for using this ability effectively.
```

#### 8. Test the Ability

1. Run `npm run build` to check for TypeScript errors
2. Start the game with `npm run dev`
3. Test each level of the ability
4. Test interactions with other abilities

---

## Adding a New Bot Personality

### Bot Design Philosophy

1. **One Dominant Behavior** - Each bot should have a clear, distinct playstyle
2. **Survival Instinct** - All bots share the flee-from-danger behavior
3. **Feel Different** - Players should notice different challenge types
4. **Descriptive Name** - Name hints at playstyle

### Implementation Steps

#### 1. Add the Personality Type

Edit `shared/src/types.ts`:

```typescript
export type BotPersonality =
  | 'blitz'
  | 'demoman'
  | 'rat'
  | 'your_new_personality';  // Add here
```

#### 2. Create the Personality Handler

Create `server/src/ai/personalities/YourNewPersonality.ts`:

```typescript
import { BotAction } from '@bomberroyal/shared';
import { Bot, BotGameView, BotPersonalityHandler } from '../BotTypes.js';
import {
  findNearestPowerUp,
  findWeakestPlayer,
  moveToRandomSafe,
  findNearestDestructible,
  getOtherPlayers,
} from '../BotCore.js';
import {
  findPath,
  getDirectionToward,
  distance,
  getAdjacentDestructibles,
  countEscapeRoutes,
} from '../Pathfinding.js';

/**
 * YOUR_NEW_PERSONALITY - The [Archetype]
 * Philosophy: "[Playstyle description]"
 *
 * Behavior Priorities:
 * 1. Survive (flee from danger) - handled by BotManager
 * 2. [Your priority 1]
 * 3. [Your priority 2]
 * 4. [Your priority 3]
 */
export const YourNewPersonality: BotPersonalityHandler = {
  decide(bot: Bot, gameView: BotGameView, dangerTiles: Set<string>): BotAction {
    const botPos = bot.player.position;
    const player = bot.player;
    const currentBombCount = gameView.bombs.filter(b => b.ownerId === player.id).length;

    // Priority 1: Your first behavior
    // ...

    // Priority 2: Your second behavior
    // ...

    // Default: What to do when nothing else applies
    bot.state = 'idle';
    return moveToRandomSafe(botPos, gameView, dangerTiles);
  },
};
```

#### 3. Register the Personality

Edit `server/src/ai/BotManager.ts`:

```typescript
import { YourNewPersonality } from './personalities/YourNewPersonality.js';

// In the personalityHandlers object:
const personalityHandlers: Record<BotPersonality, BotPersonalityHandler> = {
  blitz: BlitzPersonality,
  demoman: DemomanPersonality,
  rat: RatPersonality,
  your_new_personality: YourNewPersonality,  // Add here
};

// Update the display names:
const displayNames: Record<BotPersonality, string> = {
  blitz: 'Bot Blitz',
  demoman: 'Bot Demoman',
  rat: 'Bot Rat',
  your_new_personality: 'Bot YourName',  // Add here
};
```

#### 4. Update Bot Rotation (optional)

If you want the new personality to appear in "Fill Bots":

Edit `server/src/ai/BotManager.ts`:

```typescript
export function addBotsToRoom(room: Room, botCount: number): void {
  const personalities: BotPersonality[] = [
    'blitz',
    'demoman',
    'rat',
    'your_new_personality',  // Add to rotation
  ];
  // ...
}
```

#### 5. Update Documentation

Add your bot to `game-docs/BOTS.md`:

```markdown
## [Emoji] YourName (The [Archetype])

**Philosophy:** "[Playstyle motto]"

**Behavior:**
- [Behavior 1]
- [Behavior 2]
- [Behavior 3]

**Strengths:**
- [Strength 1]
- [Strength 2]

**Weaknesses:**
- [Weakness 1]
- [Weakness 2]

**How to Beat:**
- [Strategy 1]
- [Strategy 2]
```

#### 6. Test the Bot

1. Run `npm run build` to check for TypeScript errors
2. Start the game with `npm run dev`
3. Add bots and observe behavior
4. Test against the bot to verify playstyle

### Available Bot Utilities

The following utilities are available in `BotCore.ts` and `Pathfinding.ts`:

```typescript
// Danger awareness
calculateDangerTiles(gameView)  // Returns Set of dangerous tile keys
isDangerous(pos, dangerTiles)   // Check if position is dangerous

// Target finding
findNearestPowerUp(pos, gameView, types?)  // Find power-up
findWeakestPlayer(gameView, excludeId)     // Find weakest enemy
findNearestPlayer(gameView, excludeId)     // Find closest enemy
findNearestDestructible(pos, gameView)     // Find block to bomb
getOtherPlayers(gameView, excludeId)       // Get all enemies

// Pathfinding
findPath(from, to, gameView, dangerTiles)  // A* path
getDirectionToward(from, to)               // Direction to next step
distance(a, b)                              // Manhattan distance
countEscapeRoutes(pos, gameView)           // Count safe exits

// Movement
moveToRandomSafe(pos, gameView, dangerTiles)  // Random safe direction
getAdjacentWalkable(pos, gameView)            // Walkable neighbors
getAdjacentDestructibles(pos, gameView)       // Blocks to bomb
```

---

## Documentation Requirements

**Every code change should include documentation updates:**

1. Update `CLAUDE.md` with new features/changes
2. Add entry to `CHANGELOG.md`
3. Update relevant docs:
   - `game-docs/ABILITIES.md` for new abilities
   - `game-docs/BOTS.md` for new bot personalities
   - `game-docs/HOW-TO-PLAY.md` for new controls/mechanics
   - `docs/DEVELOPMENT.md` for new development workflows

---

## Code Style Guidelines

### TypeScript

- Use strict mode (enforced by tsconfig)
- No unused variables or parameters
- Explicit return types for functions
- Use interfaces over type aliases where possible

### React

- Functional components with hooks
- Custom hooks for reusable logic
- Component files in `components/` folder

### Server

- Server-side validation for all player actions
- Game state is authoritative (client is just a view)
- Socket.io for real-time communication
- 20 ticks/second game loop

### Naming

- `camelCase` for variables and functions
- `PascalCase` for types, interfaces, and components
- `SCREAMING_SNAKE_CASE` for constants
- Descriptive names over abbreviations

---

## Testing Your Changes

```bash
# Check TypeScript compilation
npm run build

# Start development servers
npm run dev

# Test in browser
# 1. Create room
# 2. Add bots or second browser
# 3. Test your changes
```

---

## Submitting Changes

1. Create a feature branch
2. Make your changes
3. Update documentation
4. Test thoroughly
5. Commit with descriptive message
6. Push and create pull request (if using GitHub)
