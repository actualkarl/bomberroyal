import { Cell } from '@bomberroyal/shared';
import { DEFAULT_GRID_WIDTH, DEFAULT_GRID_HEIGHT } from '@bomberroyal/shared';

// Spawn positions for 4 players (corners with safe zones)
export const SPAWN_POSITIONS = [
  { x: 1, y: 1 },      // Top-left (red)
  { x: 13, y: 1 },     // Top-right (blue)
  { x: 1, y: 11 },     // Bottom-left (green)
  { x: 13, y: 11 },    // Bottom-right (yellow)
];

// Safe zone cells around each spawn (player needs room to move/place bombs)
function getSafeZoneCells(spawnX: number, spawnY: number): Set<string> {
  const safeCells = new Set<string>();
  // 3x3 area around spawn
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      safeCells.add(`${spawnX + dx},${spawnY + dy}`);
    }
  }
  // Extended corridor for escape (2 cells in each cardinal direction)
  safeCells.add(`${spawnX + 2},${spawnY}`);
  safeCells.add(`${spawnX},${spawnY + 2}`);
  return safeCells;
}

export function generateGrid(
  width: number = DEFAULT_GRID_WIDTH,
  height: number = DEFAULT_GRID_HEIGHT
): Cell[][] {
  const grid: Cell[][] = [];

  // Collect all safe zone cells
  const safeCells = new Set<string>();
  for (const spawn of SPAWN_POSITIONS) {
    const spawnSafe = getSafeZoneCells(spawn.x, spawn.y);
    spawnSafe.forEach(cell => safeCells.add(cell));
  }

  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < width; x++) {
      const cellKey = `${x},${y}`;

      // Border walls
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        row.push('indestructible');
      }
      // Checkered indestructible pattern (like classic Bomberman)
      else if (x % 2 === 0 && y % 2 === 0) {
        row.push('indestructible');
      }
      // Safe zones around spawns
      else if (safeCells.has(cellKey)) {
        row.push('empty');
      }
      // Random destructible blocks (~70% coverage of remaining cells)
      else if (Math.random() < 0.7) {
        row.push('destructible');
      }
      else {
        row.push('empty');
      }
    }
    grid.push(row);
  }

  return grid;
}

export function isWalkable(grid: Cell[][], x: number, y: number): boolean {
  if (x < 0 || y < 0 || y >= grid.length || x >= grid[0].length) {
    return false;
  }
  const cell = grid[y][x];
  return cell === 'empty';
}

export function isValidPosition(
  grid: Cell[][],
  x: number,
  y: number
): boolean {
  return x >= 0 && y >= 0 && y < grid.length && x < grid[0].length;
}

export function destroyBlock(grid: Cell[][], x: number, y: number): boolean {
  if (!isValidPosition(grid, x, y)) return false;
  if (grid[y][x] === 'destructible') {
    grid[y][x] = 'empty';
    return true;
  }
  return false;
}
