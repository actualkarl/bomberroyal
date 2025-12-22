import { Room, Cell, Player } from '@bomberroyal/shared';
import { SHRINK_AMOUNT } from '@bomberroyal/shared';

// Process shrink zone - returns true if shrink occurred
export function processShrinkZone(
  room: Room,
  currentTime: number
): { shrunk: boolean; killedPlayers: string[] } {
  const { shrinkZone, grid } = room.gameState;
  const killedPlayers: string[] = [];

  // Check if shrink should start
  if (!shrinkZone.active) {
    const gameStartTime = room.gameState.startedAt || 0;
    if (currentTime - gameStartTime >= room.settings.shrinkStartDelay) {
      shrinkZone.active = true;
      shrinkZone.nextShrinkAt = currentTime + shrinkZone.shrinkInterval;
    }
    return { shrunk: false, killedPlayers };
  }

  // Check if it's time to shrink
  if (currentTime < shrinkZone.nextShrinkAt) {
    return { shrunk: false, killedPlayers };
  }

  const { currentBounds } = shrinkZone;
  const gridWidth = grid[0]?.length || 0;
  const gridHeight = grid.length;

  // Check if we can still shrink
  const canShrinkWidth = currentBounds.maxX - currentBounds.minX > 2;
  const canShrinkHeight = currentBounds.maxY - currentBounds.minY > 2;

  if (!canShrinkWidth && !canShrinkHeight) {
    return { shrunk: false, killedPlayers };
  }

  // Determine which edges to shrink (alternate or shrink all)
  const shrinkLeft = canShrinkWidth;
  const shrinkRight = canShrinkWidth;
  const shrinkTop = canShrinkHeight;
  const shrinkBottom = canShrinkHeight;

  // Mark cells as death zone
  if (shrinkLeft) {
    const x = currentBounds.minX;
    for (let y = currentBounds.minY; y <= currentBounds.maxY; y++) {
      if (grid[y]?.[x] !== undefined) {
        grid[y][x] = 'shrink_death';
      }
    }
    currentBounds.minX += SHRINK_AMOUNT;
  }

  if (shrinkRight) {
    const x = currentBounds.maxX;
    for (let y = currentBounds.minY; y <= currentBounds.maxY; y++) {
      if (grid[y]?.[x] !== undefined) {
        grid[y][x] = 'shrink_death';
      }
    }
    currentBounds.maxX -= SHRINK_AMOUNT;
  }

  if (shrinkTop) {
    const y = currentBounds.minY;
    for (let x = currentBounds.minX; x <= currentBounds.maxX; x++) {
      if (grid[y]?.[x] !== undefined) {
        grid[y][x] = 'shrink_death';
      }
    }
    currentBounds.minY += SHRINK_AMOUNT;
  }

  if (shrinkBottom) {
    const y = currentBounds.maxY;
    for (let x = currentBounds.minX; x <= currentBounds.maxX; x++) {
      if (grid[y]?.[x] !== undefined) {
        grid[y][x] = 'shrink_death';
      }
    }
    currentBounds.maxY -= SHRINK_AMOUNT;
  }

  // Kill players in death zone
  for (const player of room.players) {
    if (!player.alive) continue;

    const { x, y } = player.position;
    const inDeathZone =
      x < currentBounds.minX ||
      x > currentBounds.maxX ||
      y < currentBounds.minY ||
      y > currentBounds.maxY ||
      grid[y]?.[x] === 'shrink_death';

    if (inDeathZone) {
      // Shield doesn't protect from shrink zone
      player.alive = false;
      player.stats.deaths++;
      killedPlayers.push(player.id);
    }
  }

  // Schedule next shrink
  shrinkZone.nextShrinkAt = currentTime + shrinkZone.shrinkInterval;

  return { shrunk: true, killedPlayers };
}

// Check if position is in safe zone
export function isInSafeZone(
  room: Room,
  x: number,
  y: number
): boolean {
  const { currentBounds } = room.gameState.shrinkZone;
  return (
    x >= currentBounds.minX &&
    x <= currentBounds.maxX &&
    y >= currentBounds.minY &&
    y <= currentBounds.maxY
  );
}

// Get time until next shrink
export function getTimeUntilShrink(
  room: Room,
  currentTime: number
): number {
  const { shrinkZone } = room.gameState;

  if (!shrinkZone.active) {
    const gameStartTime = room.gameState.startedAt || 0;
    const timeUntilStart = room.settings.shrinkStartDelay - (currentTime - gameStartTime);
    return Math.max(0, timeUntilStart);
  }

  return Math.max(0, shrinkZone.nextShrinkAt - currentTime);
}
