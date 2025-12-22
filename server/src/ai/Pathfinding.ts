import PF from 'pathfinding';
import { Cell } from '@bomberroyal/shared';
import { Position, BotGameView } from './BotTypes.js';

// Create pathfinding grid from game state
function createGrid(
  gameView: BotGameView,
  dangerTiles?: Set<string>,
  avoidBombs: boolean = true
): PF.Grid {
  const grid = new PF.Grid(gameView.gridWidth, gameView.gridHeight);

  // Mark obstacles based on cell types
  for (let y = 0; y < gameView.gridHeight; y++) {
    for (let x = 0; x < gameView.gridWidth; x++) {
      const cell = gameView.grid[y]?.[x];
      if (cell !== 'empty') {
        grid.setWalkableAt(x, y, false);
      }
    }
  }

  // Mark bombs as obstacles
  if (avoidBombs) {
    for (const bomb of gameView.bombs) {
      grid.setWalkableAt(bomb.position.x, bomb.position.y, false);
    }
  }

  // Mark danger tiles as obstacles (for safe pathfinding)
  if (dangerTiles) {
    for (const key of dangerTiles) {
      const [x, y] = key.split(',').map(Number);
      if (x >= 0 && x < gameView.gridWidth && y >= 0 && y < gameView.gridHeight) {
        grid.setWalkableAt(x, y, false);
      }
    }
  }

  return grid;
}

// Find path from one position to another
export function findPath(
  from: Position,
  to: Position,
  gameView: BotGameView,
  dangerTiles?: Set<string>,
  avoidBombs: boolean = true
): Position[] {
  const grid = createGrid(gameView, dangerTiles, avoidBombs);

  // Make sure start and end are walkable for pathfinding
  // (we clone the grid so we don't modify the original)
  const gridClone = grid.clone();

  // If start position is blocked (e.g., we're on a bomb), temporarily allow it
  gridClone.setWalkableAt(from.x, from.y, true);

  const finder = new PF.AStarFinder({
    allowDiagonal: false,
  });

  const path = finder.findPath(from.x, from.y, to.x, to.y, gridClone);

  return path.map(([x, y]) => ({ x, y }));
}

// Get the next move direction to reach a target
export function getDirectionToward(from: Position, to: Position): 'up' | 'down' | 'left' | 'right' | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Prefer horizontal movement, then vertical
  if (dx > 0) return 'right';
  if (dx < 0) return 'left';
  if (dy > 0) return 'down';
  if (dy < 0) return 'up';

  return null;
}

// Find nearest safe tile using BFS
export function findNearestSafeTile(
  pos: Position,
  dangerTiles: Set<string>,
  gameView: BotGameView
): Position | null {
  const visited = new Set<string>();
  const queue: Position[] = [pos];
  const maxIterations = gameView.gridWidth * gameView.gridHeight; // Prevent infinite loops
  let iterations = 0;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    // Check if this tile is safe and walkable
    const cell = gameView.grid[current.y]?.[current.x];
    if (!dangerTiles.has(key) && cell === 'empty') {
      // Make sure it's not where we already are (unless start is safe)
      if (current.x !== pos.x || current.y !== pos.y || !dangerTiles.has(`${pos.x},${pos.y}`)) {
        return current;
      }
    }

    // Add neighbors (only walkable ones)
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const n of neighbors) {
      const nKey = `${n.x},${n.y}`;
      if (!visited.has(nKey) && isInBounds(n, gameView) && isWalkable(n.x, n.y, gameView)) {
        queue.push(n);
      }
    }
  }

  return null;
}

// Check if position is in bounds
export function isInBounds(pos: Position, gameView: BotGameView): boolean {
  return pos.x >= 0 && pos.x < gameView.gridWidth &&
         pos.y >= 0 && pos.y < gameView.gridHeight;
}

// Check if position is walkable (empty cell)
export function isWalkable(x: number, y: number, gameView: BotGameView): boolean {
  if (!isInBounds({ x, y }, gameView)) return false;
  return gameView.grid[y]?.[x] === 'empty';
}

// Manhattan distance
export function distance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Count escape routes from a position (number of adjacent walkable tiles)
export function countEscapeRoutes(pos: Position, gameView: BotGameView): number {
  const neighbors = [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 },
  ];

  return neighbors.filter(n => isWalkable(n.x, n.y, gameView)).length;
}

// Check if bot can safely place a bomb and escape
// This simulates the bomb blast and checks if there's a safe tile to flee to
export function canSafelyPlaceBomb(
  pos: Position,
  blastRadius: number,
  gameView: BotGameView,
  existingDangerTiles: Set<string>
): boolean {
  // Calculate danger tiles if we place a bomb here
  const simulatedDanger = new Set(existingDangerTiles);

  // Add the bomb position
  simulatedDanger.add(`${pos.x},${pos.y}`);

  // Add explosion cross pattern
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  for (const dir of directions) {
    for (let i = 1; i <= blastRadius; i++) {
      const x = pos.x + dir.x * i;
      const y = pos.y + dir.y * i;

      if (x < 0 || x >= gameView.gridWidth || y < 0 || y >= gameView.gridHeight) {
        break;
      }

      const cell = gameView.grid[y]?.[x];
      if (cell === 'indestructible') break;

      simulatedDanger.add(`${x},${y}`);

      if (cell === 'destructible') break;
    }
  }

  // Check if there's a safe tile to escape to
  const safeTile = findNearestSafeTile(pos, simulatedDanger, gameView);
  if (!safeTile) return false;

  // Check if we can actually path to the safe tile
  const path = findPath(pos, safeTile, gameView, simulatedDanger);
  return path.length > 1;
}

// Count adjacent walls/blocks
export function countAdjacentWalls(pos: Position, gameView: BotGameView): number {
  const neighbors = [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 },
  ];

  return neighbors.filter(n => {
    if (!isInBounds(n, gameView)) return true;  // Edge counts as wall
    const cell = gameView.grid[n.y]?.[n.x];
    return cell !== 'empty';
  }).length;
}

// Get adjacent positions that are walkable
export function getAdjacentWalkable(pos: Position, gameView: BotGameView): Position[] {
  const neighbors = [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 },
  ];

  return neighbors.filter(n => isWalkable(n.x, n.y, gameView));
}

// Get adjacent destructible blocks
export function getAdjacentDestructibles(pos: Position, gameView: BotGameView): Position[] {
  const neighbors = [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 },
  ];

  return neighbors.filter(n => {
    if (!isInBounds(n, gameView)) return false;
    return gameView.grid[n.y]?.[n.x] === 'destructible';
  });
}
