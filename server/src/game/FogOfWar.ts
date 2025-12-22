import { Player, Cell, VisibleBomb, Bomb, Explosion, PowerUpDrop } from '@bomberroyal/shared';
import { BOMB_AUDIO_RANGE, BOMB_WARNING_TIME } from '@bomberroyal/shared';

// Calculate Euclidean distance between two points
function getEuclideanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Calculate direction angle from player to target (in radians)
function getDirection(
  playerX: number,
  playerY: number,
  targetX: number,
  targetY: number
): number {
  return Math.atan2(targetY - playerY, targetX - playerX);
}

// Check if a cell blocks line of sight
function isBlockingCell(cellType: Cell): boolean {
  return cellType === 'destructible' || cellType === 'indestructible';
}

// Bresenham's line algorithm to trace ray from start to end
// Returns true if there's a clear line of sight
export function hasLineOfSight(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  grid: Cell[][]
): boolean {
  // If same position, always visible
  if (startX === endX && startY === endY) {
    return true;
  }

  const dx = Math.abs(endX - startX);
  const dy = Math.abs(endY - startY);
  const sx = startX < endX ? 1 : -1;
  const sy = startY < endY ? 1 : -1;
  let err = dx - dy;

  let x = startX;
  let y = startY;

  // We check all cells except start and end
  while (x !== endX || y !== endY) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }

    // If we've reached the end, stop
    if (x === endX && y === endY) {
      break;
    }

    // Check if this intermediate cell blocks sight
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      if (isBlockingCell(grid[y][x])) {
        return false;
      }
    } else {
      // Out of bounds, blocks sight
      return false;
    }
  }

  return true;
}

// Check if a cell is visible to a player using line-of-sight raycasting
export function isCellVisible(
  player: Player,
  cellX: number,
  cellY: number,
  grid?: Cell[][]
): boolean {
  // Check distance first (fog radius)
  const distance = getEuclideanDistance(
    player.position.x,
    player.position.y,
    cellX,
    cellY
  );

  if (distance > player.fogRadius) {
    return false;
  }

  // If no grid provided, just use distance check
  if (!grid) {
    return true;
  }

  // Check line of sight
  return hasLineOfSight(
    player.position.x,
    player.position.y,
    cellX,
    cellY,
    grid
  );
}

// Get visible cells for a player with line-of-sight
export function getVisibleCells(
  player: Player,
  grid: Cell[][]
): { x: number; y: number; type: Cell }[] {
  const visibleCells: { x: number; y: number; type: Cell }[] = [];

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (isCellVisible(player, x, y, grid)) {
        visibleCells.push({ x, y, type: grid[y][x] });
      }
    }
  }

  return visibleCells;
}

// Get visible players for a player with line-of-sight
export function getVisiblePlayers(
  viewer: Player,
  allPlayers: Player[],
  grid?: Cell[][]
): Player[] {
  return allPlayers.filter(
    (p) =>
      p.id !== viewer.id &&
      p.alive &&
      isCellVisible(viewer, p.position.x, p.position.y, grid)
  );
}

// Calculate bomb visibility and audio properties for a player
export function getVisibleBombs(
  viewer: Player,
  bombs: Bomb[],
  currentTime: number,
  grid?: Cell[][]
): VisibleBomb[] {
  const visibleBombs: VisibleBomb[] = [];

  for (const bomb of bombs) {
    const distance = getEuclideanDistance(
      viewer.position.x,
      viewer.position.y,
      bomb.position.x,
      bomb.position.y
    );

    const timeRemaining = bomb.placedAt + bomb.fuseTime - currentTime;
    const direction = getDirection(
      viewer.position.x,
      viewer.position.y,
      bomb.position.x,
      bomb.position.y
    );

    // Always show own bombs
    if (bomb.ownerId === viewer.id) {
      visibleBombs.push({
        ...bomb,
        visibility: timeRemaining <= BOMB_WARNING_TIME ? 'warning' : 'audio_range',
        distanceToPlayer: distance,
        direction,
        timeRemaining,
      });
      continue;
    }

    // Determine visibility state based on distance, time, and line of sight
    let visibility: VisibleBomb['visibility'] = 'hidden';

    if (timeRemaining <= 0) {
      // Exploding - always visible if within range
      visibility = 'exploding';
    } else if (timeRemaining <= BOMB_WARNING_TIME) {
      // Warning state - visible through fog (within certain range)
      if (distance <= viewer.fogRadius + 5) {  // Extended range for warning
        visibility = 'warning';
      }
    } else if (distance <= BOMB_AUDIO_RANGE) {
      // Audio range - audible but not necessarily visible
      visibility = 'audio_range';
    } else if (isCellVisible(viewer, bomb.position.x, bomb.position.y, grid)) {
      // In fog radius with line of sight - fully visible
      visibility = 'audio_range';
    }

    // Only include bombs that are visible, in warning, or in audio range
    if (visibility !== 'hidden') {
      visibleBombs.push({
        ...bomb,
        visibility,
        distanceToPlayer: distance,
        direction,
        timeRemaining,
      });
    }
  }

  return visibleBombs;
}

// Get visible power-ups for a player with line-of-sight
export function getVisiblePowerUps(
  viewer: Player,
  powerUps: PowerUpDrop[],
  grid?: Cell[][]
): PowerUpDrop[] {
  return powerUps.filter((pu) =>
    isCellVisible(viewer, pu.position.x, pu.position.y, grid)
  );
}

// Explosions are always visible within a certain range (per design spec)
export function getVisibleExplosions(
  explosions: Explosion[],
  viewer?: Player
): Explosion[] {
  if (!viewer) {
    return explosions;
  }

  // Explosions visible within 5 tile range (regardless of line of sight)
  const explosionVisibleRange = 5;
  return explosions.filter((explosion) => {
    // Check if any cell of the explosion is within range
    return explosion.cells.some((cell) => {
      const distance = getEuclideanDistance(
        viewer.position.x,
        viewer.position.y,
        cell.x,
        cell.y
      );
      return distance <= explosionVisibleRange;
    });
  });
}
