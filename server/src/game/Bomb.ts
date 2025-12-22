import { Bomb, Cell, Explosion, Player } from '@bomberroyal/shared';
import { EXPLOSION_DURATION, BOMB_SLIDE_SPEED } from '@bomberroyal/shared';
import { getAbilityLevel } from '../abilities/index.js';
import { QuickFuseAbility } from '../abilities/QuickFuseAbility.js';
import { PiercingBombAbility } from '../abilities/PiercingBombAbility.js';

// Generate unique bomb ID
function generateBombId(): string {
  return `bomb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique explosion ID
function generateExplosionId(): string {
  return `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Place a bomb at the player's current position
export function placeBomb(
  player: Player,
  bombs: Map<string, Bomb>
): Bomb | null {
  // Check if player can place more bombs
  if (player.bombCount >= player.maxBombs) {
    return null;
  }

  // Check if there's already a bomb at this position
  const existingBomb = Array.from(bombs.values()).find(
    (b) => b.position.x === player.position.x && b.position.y === player.position.y
  );
  if (existingBomb) {
    return null;
  }

  // Get fuse time based on quick_fuse ability level
  const quickFuseLevel = getAbilityLevel(player, 'quick_fuse');
  const fuseTime = QuickFuseAbility.getFuseTime(quickFuseLevel);

  // Check if player has piercing bomb ability
  const hasPiercing = PiercingBombAbility.hasPiercing(player);

  const bomb: Bomb = {
    id: generateBombId(),
    ownerId: player.id,
    position: { x: player.position.x, y: player.position.y },
    blastRadius: player.blastRadius,
    placedAt: Date.now(),
    fuseTime,
    isPiercing: hasPiercing,
    // Sliding state
    isSliding: false,
    slideDirection: null,
    slideProgress: 0,
    kickedBy: null,
  };

  bombs.set(bomb.id, bomb);
  player.bombCount++;
  player.stats.bombsPlaced++;

  return bomb;
}

// Kick a bomb in a direction
export function kickBomb(
  bomb: Bomb,
  direction: 'up' | 'down' | 'left' | 'right',
  kickLevel: number,
  kickerId: string
): void {
  if (kickLevel <= 0) return;

  bomb.isSliding = true;
  bomb.slideDirection = direction;
  bomb.slideProgress = 0;
  bomb.kickedBy = kickerId;
}

// Process sliding bombs
export function processSlidingBombs(
  bombs: Map<string, Bomb>,
  grid: Cell[][],
  deltaTime: number,
  players: Player[]
): void {
  const slideDistance = (BOMB_SLIDE_SPEED * deltaTime) / 1000; // Convert to tiles

  for (const bomb of bombs.values()) {
    if (!bomb.isSliding || !bomb.slideDirection) continue;

    bomb.slideProgress += slideDistance;

    // Check if bomb has moved a full tile
    if (bomb.slideProgress >= 1) {
      const dx = bomb.slideDirection === 'left' ? -1 : bomb.slideDirection === 'right' ? 1 : 0;
      const dy = bomb.slideDirection === 'up' ? -1 : bomb.slideDirection === 'down' ? 1 : 0;

      const newX = bomb.position.x + dx;
      const newY = bomb.position.y + dy;

      // Check if new position is valid
      if (canBombMoveTo(newX, newY, grid, bombs, bomb.id, players)) {
        bomb.position.x = newX;
        bomb.position.y = newY;
        bomb.slideProgress -= 1;
      } else {
        // Hit obstacle, stop sliding
        stopBombSlide(bomb);
      }
    }
  }
}

// Check if bomb can move to a position
function canBombMoveTo(
  x: number,
  y: number,
  grid: Cell[][],
  bombs: Map<string, Bomb>,
  excludeBombId: string,
  players: Player[]
): boolean {
  // Check grid bounds
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) {
    return false;
  }

  // Check cell type
  const cell = grid[y][x];
  if (cell !== 'empty') {
    return false;
  }

  // Check for other bombs at the position
  for (const bomb of bombs.values()) {
    if (bomb.id !== excludeBombId &&
        bomb.position.x === x &&
        bomb.position.y === y) {
      return false;
    }
  }

  // Check for players at the position (bombs stop when hitting players)
  for (const player of players) {
    if (player.alive && player.position.x === x && player.position.y === y) {
      return false;
    }
  }

  return true;
}

// Stop a bomb from sliding
export function stopBombSlide(bomb: Bomb): void {
  bomb.isSliding = false;
  bomb.slideDirection = null;
  bomb.slideProgress = 0;
}

// Check if a player walking into a bomb should kick it
export function tryKickBomb(
  player: Player,
  targetX: number,
  targetY: number,
  direction: 'up' | 'down' | 'left' | 'right',
  bombs: Map<string, Bomb>,
  grid: Cell[][],
  players: Player[]
): boolean {
  if (!player.canKickBombs || player.kickLevel <= 0) {
    return false;
  }

  // Find bomb at target position
  const bombAtTarget = Array.from(bombs.values()).find(
    (b) => b.position.x === targetX && b.position.y === targetY && !b.isSliding
  );

  if (!bombAtTarget) {
    return false;
  }

  // Calculate where the bomb will land
  const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
  const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
  const nextX = targetX + dx;
  const nextY = targetY + dy;

  // Check if the bomb can be kicked (next position is valid)
  if (!canBombMoveTo(nextX, nextY, grid, bombs, bombAtTarget.id, players)) {
    return false;
  }

  // Kick the bomb
  kickBomb(bombAtTarget, direction, player.kickLevel, player.id);
  return true;
}

// Stop all sliding bombs kicked by a specific player (for spacebar stop at level 3)
export function stopPlayerKickedBombs(bombs: Map<string, Bomb>, playerId: string): number {
  let stoppedCount = 0;
  for (const bomb of bombs.values()) {
    if (bomb.isSliding && bomb.kickedBy === playerId) {
      stopBombSlide(bomb);
      stoppedCount++;
    }
  }
  return stoppedCount;
}

// Check which bombs should explode
export function processExplodingBombs(
  bombs: Map<string, Bomb>,
  currentTime: number
): Bomb[] {
  const explodingBombs: Bomb[] = [];

  for (const bomb of bombs.values()) {
    const elapsed = currentTime - bomb.placedAt;
    if (elapsed >= bomb.fuseTime) {
      explodingBombs.push(bomb);
    }
  }

  return explodingBombs;
}

// Calculate explosion cells
export function calculateExplosionCells(
  bomb: Bomb,
  grid: Cell[][],
  bombs: Map<string, Bomb>
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length || 0;

  // Add center cell
  cells.push({ x: bomb.position.x, y: bomb.position.y });

  // Spread in 4 directions
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
  ];

  for (const { dx, dy } of directions) {
    for (let i = 1; i <= bomb.blastRadius; i++) {
      const x = bomb.position.x + dx * i;
      const y = bomb.position.y + dy * i;

      // Check bounds
      if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
        break;
      }

      const cellType = grid[y][x];

      // Stop at indestructible blocks
      if (cellType === 'indestructible') {
        break;
      }

      // Add cell to explosion
      cells.push({ x, y });

      // Stop at destructible blocks (unless piercing)
      if (cellType === 'destructible' && !bomb.isPiercing) {
        break;
      }
    }
  }

  return cells;
}

// Create an explosion from a bomb
export function createExplosion(
  bomb: Bomb,
  explosionCells: { x: number; y: number }[]
): Explosion {
  return {
    id: generateExplosionId(),
    cells: explosionCells,
    ownerId: bomb.ownerId,
    startedAt: Date.now(),
    duration: EXPLOSION_DURATION,
  };
}

// Process destruction from explosion
export function processExplosionDestruction(
  explosion: Explosion,
  grid: Cell[][],
  players: Player[],
  bombs: Map<string, Bomb>
): {
  destroyedBlocks: { x: number; y: number }[];
  killedPlayers: string[];
  chainedBombs: Bomb[];
} {
  const destroyedBlocks: { x: number; y: number }[] = [];
  const killedPlayers: string[] = [];
  const chainedBombs: Bomb[] = [];

  for (const cell of explosion.cells) {
    const { x, y } = cell;

    // Destroy destructible blocks
    if (grid[y]?.[x] === 'destructible') {
      grid[y][x] = 'empty';
      destroyedBlocks.push({ x, y });
    }

    // Kill players in explosion
    for (const player of players) {
      if (
        player.alive &&
        player.position.x === x &&
        player.position.y === y
      ) {
        // Check for shield
        if (player.hasShield) {
          player.hasShield = false;
          // Remove shield from power-ups
          player.powerUps = player.powerUps.filter((p) => p.type !== 'shield');
          // Reset shield ability level
          const abilities = player.abilities as Record<string, { level: number }>;
          if (abilities.shield) {
            abilities.shield.level = 0;
          }
        } else {
          player.alive = false;
          player.stats.deaths++;
          killedPlayers.push(player.id);
        }
      }
    }

    // Chain explosions - detonate other bombs in blast radius
    for (const bomb of bombs.values()) {
      if (
        bomb.position.x === x &&
        bomb.position.y === y &&
        !chainedBombs.includes(bomb)
      ) {
        chainedBombs.push(bomb);
      }
    }
  }

  return { destroyedBlocks, killedPlayers, chainedBombs };
}

// Remove expired explosions
export function processExpiredExplosions(
  explosions: Map<string, Explosion>,
  currentTime: number
): void {
  for (const [id, explosion] of explosions) {
    if (currentTime - explosion.startedAt >= explosion.duration) {
      explosions.delete(id);
    }
  }
}

// Return bomb to player when it explodes
export function returnBombToPlayer(
  bomb: Bomb,
  players: Player[]
): void {
  const player = players.find((p) => p.id === bomb.ownerId);
  if (player) {
    player.bombCount = Math.max(0, player.bombCount - 1);
  }
}
