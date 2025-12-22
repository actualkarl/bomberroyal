import { Player, Bomb, BotAction, Cell } from '@bomberroyal/shared';
import { Bot, BotGameView, Position } from './BotTypes.js';
import {
  findPath,
  findNearestSafeTile,
  getDirectionToward,
  isWalkable,
  distance,
  getAdjacentWalkable,
} from './Pathfinding.js';

// Calculate which tiles will be hit by explosions
export function calculateDangerTiles(gameView: BotGameView): Set<string> {
  const dangerous = new Set<string>();

  for (const bomb of gameView.bombs) {
    // The bomb tile itself
    dangerous.add(`${bomb.position.x},${bomb.position.y}`);

    // Explosion cross pattern
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    for (const dir of directions) {
      for (let i = 1; i <= bomb.blastRadius; i++) {
        const x = bomb.position.x + dir.x * i;
        const y = bomb.position.y + dir.y * i;

        // Out of bounds
        if (x < 0 || x >= gameView.gridWidth || y < 0 || y >= gameView.gridHeight) {
          break;
        }

        const cell = gameView.grid[y]?.[x];

        // Stop at indestructible blocks
        if (cell === 'indestructible') break;

        // Add this tile as dangerous
        dangerous.add(`${x},${y}`);

        // Stop at destructible blocks (but include that tile)
        if (cell === 'destructible') break;
      }
    }
  }

  return dangerous;
}

// Check if a position is in danger
export function isDangerous(pos: Position, dangerTiles: Set<string>): boolean {
  return dangerTiles.has(`${pos.x},${pos.y}`);
}

// Find the nearest power-up, optionally filtering by type
export function findNearestPowerUp(
  pos: Position,
  gameView: BotGameView,
  types?: string | string[]
): Position | null {
  const targetTypes = types
    ? (Array.isArray(types) ? types : [types])
    : null;

  let nearest: Position | null = null;
  let nearestDist = Infinity;

  for (const powerUp of gameView.powerUps) {
    // Check if any choice matches our target types
    if (targetTypes) {
      const hasMatchingChoice = powerUp.choices.some(choice => targetTypes.includes(choice));
      if (!hasMatchingChoice) continue;
    }

    const dist = distance(pos, powerUp.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = powerUp.position;
    }
  }

  return nearest;
}

// Find the weakest player (fewest ability upgrades)
export function findWeakestPlayer(gameView: BotGameView, excludeId: string): Player | null {
  const players = gameView.players.filter(p => p.id !== excludeId && p.alive);
  if (players.length === 0) return null;

  return players.reduce((weakest, player) => {
    const power = calculatePlayerPower(player);
    const weakestPower = calculatePlayerPower(weakest);
    return power < weakestPower ? player : weakest;
  });
}

// Calculate player power based on abilities
export function calculatePlayerPower(player: Player): number {
  let power = 0;
  const abilities = player.abilities;

  if (abilities instanceof Map) {
    for (const [, ability] of abilities) {
      power += ability.level;
    }
  } else {
    for (const key in abilities) {
      power += (abilities as Record<string, { level: number }>)[key]?.level ?? 0;
    }
  }

  return power;
}

// Find nearest other player
export function findNearestPlayer(gameView: BotGameView, excludeId: string): Player | null {
  const botPlayer = gameView.players.find(p => p.id === excludeId);
  if (!botPlayer) return null;

  const others = gameView.players.filter(p => p.id !== excludeId && p.alive);
  if (others.length === 0) return null;

  let nearest: Player | null = null;
  let nearestDist = Infinity;

  for (const player of others) {
    const dist = distance(botPlayer.position, player.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = player;
    }
  }

  return nearest;
}

// Find safe escape path from current position
export function findSafePath(
  pos: Position,
  gameView: BotGameView,
  dangerTiles: Set<string>
): Position[] | null {
  const safeTile = findNearestSafeTile(pos, dangerTiles, gameView);
  if (!safeTile) return null;

  return findPath(pos, safeTile, gameView, dangerTiles);
}

// Get other players
export function getOtherPlayers(gameView: BotGameView, excludeId: string): Player[] {
  return gameView.players.filter(p => p.id !== excludeId && p.alive);
}

// Find point furthest from all players
export function findFurthestPointFromPlayers(
  gameView: BotGameView,
  players: Player[]
): Position | null {
  let bestPos: Position | null = null;
  let bestMinDist = -1;

  for (let y = 0; y < gameView.gridHeight; y++) {
    for (let x = 0; x < gameView.gridWidth; x++) {
      if (!isWalkable(x, y, gameView)) continue;

      const pos = { x, y };
      let minDist = Infinity;

      for (const player of players) {
        const dist = distance(pos, player.position);
        if (dist < minDist) {
          minDist = dist;
        }
      }

      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestPos = pos;
      }
    }
  }

  return bestPos;
}

// Find safest power-up (far from players)
export function findSafestPowerUp(
  pos: Position,
  gameView: BotGameView,
  players: Player[],
  dangerTiles: Set<string>
): Position | null {
  let bestPowerUp: Position | null = null;
  let bestScore = -Infinity;

  for (const powerUp of gameView.powerUps) {
    // Skip if in danger zone
    if (dangerTiles.has(`${powerUp.position.x},${powerUp.position.y}`)) continue;

    // Calculate safety score (distance from all players)
    let minPlayerDist = Infinity;
    for (const player of players) {
      const dist = distance(powerUp.position, player.position);
      if (dist < minPlayerDist) {
        minPlayerDist = dist;
      }
    }

    // Score: prefer closer to us but farther from enemies
    const distToUs = distance(pos, powerUp.position);
    const score = minPlayerDist * 2 - distToUs;

    if (score > bestScore) {
      bestScore = score;
      bestPowerUp = powerUp.position;
    }
  }

  return bestPowerUp;
}

// Find nearest destructible block
export function findNearestDestructible(pos: Position, gameView: BotGameView): Position | null {
  let nearest: Position | null = null;
  let nearestDist = Infinity;

  for (let y = 0; y < gameView.gridHeight; y++) {
    for (let x = 0; x < gameView.gridWidth; x++) {
      if (gameView.grid[y]?.[x] === 'destructible') {
        const dist = distance(pos, { x, y });
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = { x, y };
        }
      }
    }
  }

  return nearest;
}

// Check if player is distracted (in danger or fighting)
export function isDistracted(player: Player, gameView: BotGameView): boolean {
  const dangerTiles = calculateDangerTiles(gameView);
  if (isDangerous(player.position, dangerTiles)) return true;

  // Check if they're adjacent to another player (fighting)
  const otherPlayers = getOtherPlayers(gameView, player.id);
  for (const other of otherPlayers) {
    if (distance(player.position, other.position) <= 2) return true;
  }

  return false;
}

// Move toward a random safe direction
export function moveToRandomSafe(
  pos: Position,
  gameView: BotGameView,
  dangerTiles: Set<string>
): BotAction {
  const directions: Array<{ dir: 'up' | 'down' | 'left' | 'right'; pos: Position }> = [
    { dir: 'up', pos: { x: pos.x, y: pos.y - 1 } },
    { dir: 'down', pos: { x: pos.x, y: pos.y + 1 } },
    { dir: 'left', pos: { x: pos.x - 1, y: pos.y } },
    { dir: 'right', pos: { x: pos.x + 1, y: pos.y } },
  ];

  const safeDirections = directions.filter(d =>
    isWalkable(d.pos.x, d.pos.y, gameView) &&
    !dangerTiles.has(`${d.pos.x},${d.pos.y}`)
  );

  if (safeDirections.length === 0) {
    return { type: 'none' };
  }

  const chosen = safeDirections[Math.floor(Math.random() * safeDirections.length)];
  return { type: 'move', direction: chosen.dir };
}

// Main bot decision function - handles survival first
export function botTick(bot: Bot, gameView: BotGameView): BotAction {
  const dangerTiles = calculateDangerTiles(gameView);
  const botPos = bot.player.position;

  // PRIORITY 1: SURVIVAL (all personalities)
  if (isDangerous(botPos, dangerTiles)) {
    bot.state = 'fleeing';
    const safeTile = findNearestSafeTile(botPos, dangerTiles, gameView);
    if (safeTile) {
      const path = findPath(botPos, safeTile, gameView, dangerTiles);
      if (path.length > 1) {
        const dir = getDirectionToward(botPos, path[1]);
        if (dir) {
          return { type: 'move', direction: dir };
        }
      }
    }
    // Desperate: try any safe direction
    return moveToRandomSafe(botPos, gameView, dangerTiles);
  }

  // PRIORITY 2: PERSONALITY BEHAVIOR
  // This will be called from BotManager with the appropriate personality handler
  return { type: 'none' };
}
