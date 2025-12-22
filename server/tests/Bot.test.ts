import { describe, it, expect, beforeEach } from 'vitest';
import { Player, Cell, Bomb } from '@bomberroyal/shared';
import {
  calculateDangerTiles,
  isDangerous,
  findNearestPowerUp,
  findWeakestPlayer,
  calculatePlayerPower,
  findNearestPlayer,
  getOtherPlayers,
  findNearestDestructible,
} from '../src/ai/BotCore.js';
import {
  findPath,
  getDirectionToward,
  findNearestSafeTile,
  isWalkable,
  distance,
  countEscapeRoutes,
  countAdjacentWalls,
  getAdjacentWalkable,
  getAdjacentDestructibles,
} from '../src/ai/Pathfinding.js';
import { BotGameView, Position } from '../src/ai/BotTypes.js';

// Helper to create a simple empty grid
function createTestGrid(width: number, height: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      // Border walls
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        grid[y][x] = 'indestructible';
      }
      // Checkered indestructible blocks
      else if (x % 2 === 0 && y % 2 === 0) {
        grid[y][x] = 'indestructible';
      }
      else {
        grid[y][x] = 'empty';
      }
    }
  }
  return grid;
}

// Helper to create a test player
function createTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    displayName: 'Test Player',
    color: 'red',
    position: { x: 1, y: 1 },
    alive: true,
    ready: true,
    bombCount: 0,
    maxBombs: 1,
    blastRadius: 1,
    speed: 1,
    powerUps: [],
    abilities: {},
    canKickBombs: false,
    kickLevel: 0,
    canRemoteDetonate: false,
    remoteDetonateLevel: 0,
    hasShield: false,
    stats: {
      kills: 0,
      deaths: 0,
      bombsPlaced: 0,
      blocksDestroyed: 0,
      powerUpsCollected: 0,
    },
    ...overrides,
  };
}

// Helper to create a test bomb
function createTestBomb(overrides: Partial<Bomb> = {}): Bomb {
  return {
    id: 'bomb-1',
    ownerId: 'player-1',
    position: { x: 3, y: 3 },
    blastRadius: 2,
    placedAt: Date.now(),
    fuseTime: 3000,
    ...overrides,
  };
}

// Helper to create a BotGameView
function createGameView(overrides: Partial<BotGameView> = {}): BotGameView {
  const grid = createTestGrid(15, 13);
  return {
    grid,
    gridWidth: 15,
    gridHeight: 13,
    bombs: [],
    explosions: [],
    powerUps: [],
    players: [createTestPlayer()],
    shrinkZone: {
      active: false,
      currentBounds: { minX: 0, maxX: 14, minY: 0, maxY: 12 },
      shrinkInterval: 10000,
      nextShrinkAt: 0,
    },
    ...overrides,
  };
}

describe('Bot AI', () => {
  describe('Pathfinding', () => {
    describe('distance', () => {
      it('should calculate Manhattan distance', () => {
        expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
        expect(distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
        expect(distance({ x: 5, y: 5 }, { x: 2, y: 3 })).toBe(5);
      });
    });

    describe('getDirectionToward', () => {
      it('should return correct direction for horizontal movement', () => {
        expect(getDirectionToward({ x: 1, y: 1 }, { x: 2, y: 1 })).toBe('right');
        expect(getDirectionToward({ x: 2, y: 1 }, { x: 1, y: 1 })).toBe('left');
      });

      it('should return correct direction for vertical movement', () => {
        expect(getDirectionToward({ x: 1, y: 1 }, { x: 1, y: 2 })).toBe('down');
        expect(getDirectionToward({ x: 1, y: 2 }, { x: 1, y: 1 })).toBe('up');
      });

      it('should prefer horizontal over vertical when both differ', () => {
        expect(getDirectionToward({ x: 1, y: 1 }, { x: 3, y: 3 })).toBe('right');
        expect(getDirectionToward({ x: 3, y: 3 }, { x: 1, y: 1 })).toBe('left');
      });

      it('should return null for same position', () => {
        expect(getDirectionToward({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull();
      });
    });

    describe('isWalkable', () => {
      it('should return true for empty cells', () => {
        const gameView = createGameView();
        expect(isWalkable(1, 1, gameView)).toBe(true);
        expect(isWalkable(3, 1, gameView)).toBe(true);
      });

      it('should return false for indestructible blocks', () => {
        const gameView = createGameView();
        expect(isWalkable(0, 0, gameView)).toBe(false);
        expect(isWalkable(2, 2, gameView)).toBe(false);
      });

      it('should return false for out of bounds', () => {
        const gameView = createGameView();
        expect(isWalkable(-1, 0, gameView)).toBe(false);
        expect(isWalkable(100, 100, gameView)).toBe(false);
      });

      it('should return false for destructible blocks', () => {
        const gameView = createGameView();
        gameView.grid[3][3] = 'destructible';
        expect(isWalkable(3, 3, gameView)).toBe(false);
      });
    });

    describe('findPath', () => {
      it('should find a path between two points', () => {
        const gameView = createGameView();
        const path = findPath({ x: 1, y: 1 }, { x: 3, y: 1 }, gameView);
        expect(path.length).toBeGreaterThan(0);
        expect(path[0]).toEqual({ x: 1, y: 1 });
        expect(path[path.length - 1]).toEqual({ x: 3, y: 1 });
      });

      it('should avoid indestructible blocks', () => {
        const gameView = createGameView();
        // Path from (1,1) to (3,3) must go around (2,2)
        const path = findPath({ x: 1, y: 1 }, { x: 3, y: 3 }, gameView);
        expect(path.length).toBeGreaterThan(0);
        const passesThrough22 = path.some(p => p.x === 2 && p.y === 2);
        expect(passesThrough22).toBe(false);
      });

      it('should avoid danger tiles when provided', () => {
        const gameView = createGameView();
        const dangerTiles = new Set(['3,1', '1,3']);
        const path = findPath({ x: 1, y: 1 }, { x: 5, y: 1 }, gameView, dangerTiles);
        // Path should not pass through danger tiles
        for (const pos of path) {
          expect(dangerTiles.has(`${pos.x},${pos.y}`)).toBe(false);
        }
      });

      it('should return empty array for unreachable destination', () => {
        const gameView = createGameView();
        // Trying to reach inside a wall
        const path = findPath({ x: 1, y: 1 }, { x: 0, y: 0 }, gameView);
        expect(path.length).toBe(0);
      });
    });

    describe('findNearestSafeTile', () => {
      it('should find nearest safe tile when in danger', () => {
        const gameView = createGameView();
        const dangerTiles = new Set(['1,1', '2,1', '3,1', '1,2', '1,3']);
        const safeTile = findNearestSafeTile({ x: 1, y: 1 }, dangerTiles, gameView);
        expect(safeTile).not.toBeNull();
        expect(dangerTiles.has(`${safeTile!.x},${safeTile!.y}`)).toBe(false);
      });

      it('should return current position if already safe', () => {
        const gameView = createGameView();
        const dangerTiles = new Set(['5,5', '6,6']);
        const safeTile = findNearestSafeTile({ x: 1, y: 1 }, dangerTiles, gameView);
        expect(safeTile).toEqual({ x: 1, y: 1 });
      });
    });

    describe('countEscapeRoutes', () => {
      it('should count walkable adjacent tiles', () => {
        const gameView = createGameView();
        // Position (1,1) has two escape routes (right and down)
        const count = countEscapeRoutes({ x: 1, y: 1 }, gameView);
        expect(count).toBe(2);
      });

      it('should return 0 when surrounded by walls', () => {
        const gameView = createGameView();
        // Position (2,2) is indestructible in checkered pattern
        // Surround it completely - up/down/left/right are all borders or walls
        // Check the corner at (1,1) surrounded by walls
        gameView.grid[1][2] = 'indestructible'; // right of (1,1)
        gameView.grid[2][1] = 'indestructible'; // below (1,1)
        // (0,1) and (1,0) are already border walls
        const count = countEscapeRoutes({ x: 1, y: 1 }, gameView);
        expect(count).toBe(0);
      });
    });

    describe('countAdjacentWalls', () => {
      it('should count adjacent walls including borders', () => {
        const gameView = createGameView();
        // Position (1,1) is in corner, has 2 walls (top and left borders)
        const count = countAdjacentWalls({ x: 1, y: 1 }, gameView);
        expect(count).toBe(2);
      });
    });

    describe('getAdjacentWalkable', () => {
      it('should return list of walkable neighbors', () => {
        const gameView = createGameView();
        const walkable = getAdjacentWalkable({ x: 1, y: 1 }, gameView);
        expect(walkable.length).toBe(2);
        expect(walkable).toContainEqual({ x: 2, y: 1 });
        expect(walkable).toContainEqual({ x: 1, y: 2 });
      });
    });

    describe('getAdjacentDestructibles', () => {
      it('should return list of adjacent destructible blocks', () => {
        const gameView = createGameView();
        gameView.grid[1][2] = 'destructible';
        const destructibles = getAdjacentDestructibles({ x: 1, y: 1 }, gameView);
        expect(destructibles.length).toBe(1);
        expect(destructibles[0]).toEqual({ x: 2, y: 1 });
      });

      it('should return empty array when no adjacent destructibles', () => {
        const gameView = createGameView();
        const destructibles = getAdjacentDestructibles({ x: 1, y: 1 }, gameView);
        expect(destructibles.length).toBe(0);
      });
    });
  });

  describe('BotCore', () => {
    describe('calculateDangerTiles', () => {
      it('should mark bomb position as dangerous', () => {
        const bomb = createTestBomb({ position: { x: 5, y: 5 }, blastRadius: 2 });
        const gameView = createGameView({ bombs: [bomb] });
        const dangerTiles = calculateDangerTiles(gameView);
        expect(dangerTiles.has('5,5')).toBe(true);
      });

      it('should mark explosion cross pattern', () => {
        const bomb = createTestBomb({ position: { x: 5, y: 5 }, blastRadius: 2 });
        const gameView = createGameView({ bombs: [bomb] });
        const dangerTiles = calculateDangerTiles(gameView);

        // Should have bomb position + cross pattern
        expect(dangerTiles.has('5,5')).toBe(true);
        expect(dangerTiles.has('6,5')).toBe(true);
        expect(dangerTiles.has('7,5')).toBe(true);
        expect(dangerTiles.has('4,5')).toBe(true);
        expect(dangerTiles.has('3,5')).toBe(true);
        expect(dangerTiles.has('5,6')).toBe(true);
        expect(dangerTiles.has('5,7')).toBe(true);
        expect(dangerTiles.has('5,4')).toBe(true);
        expect(dangerTiles.has('5,3')).toBe(true);
      });

      it('should stop at indestructible blocks', () => {
        const bomb = createTestBomb({ position: { x: 3, y: 1 }, blastRadius: 3 });
        const gameView = createGameView({ bombs: [bomb] });
        const dangerTiles = calculateDangerTiles(gameView);

        // Should not include tiles beyond indestructible block at (2,2)
        // But (2,2) is not directly in the path from (3,1), so let's check proper blocking
        // The left direction from (3,1) should hit (2,1), (1,1), (0,1)=wall
        expect(dangerTiles.has('2,1')).toBe(true);
        expect(dangerTiles.has('1,1')).toBe(true);
        // Wall at x=0 should stop expansion
        expect(dangerTiles.has('-1,1')).toBe(false);
      });

      it('should include destructible blocks (they get destroyed)', () => {
        const gameView = createGameView();
        gameView.grid[5][4] = 'destructible';
        const bomb = createTestBomb({ position: { x: 5, y: 5 }, blastRadius: 2 });
        gameView.bombs = [bomb];
        const dangerTiles = calculateDangerTiles(gameView);

        // Should include the destructible block
        expect(dangerTiles.has('4,5')).toBe(true);
        // Should stop after destructible
        expect(dangerTiles.has('3,5')).toBe(false);
      });
    });

    describe('isDangerous', () => {
      it('should return true for positions in danger set', () => {
        const dangerTiles = new Set(['3,3', '4,4']);
        expect(isDangerous({ x: 3, y: 3 }, dangerTiles)).toBe(true);
        expect(isDangerous({ x: 4, y: 4 }, dangerTiles)).toBe(true);
      });

      it('should return false for safe positions', () => {
        const dangerTiles = new Set(['3,3', '4,4']);
        expect(isDangerous({ x: 1, y: 1 }, dangerTiles)).toBe(false);
        expect(isDangerous({ x: 5, y: 5 }, dangerTiles)).toBe(false);
      });
    });

    describe('calculatePlayerPower', () => {
      it('should return 0 for player with no abilities', () => {
        const player = createTestPlayer({ abilities: {} });
        expect(calculatePlayerPower(player)).toBe(0);
      });

      it('should sum ability levels', () => {
        const player = createTestPlayer({
          abilities: {
            bomb_count: { level: 2 },
            blast_radius: { level: 1 },
            speed: { level: 3 },
          },
        });
        expect(calculatePlayerPower(player)).toBe(6);
      });
    });

    describe('findNearestPlayer', () => {
      it('should find nearest other player', () => {
        const player1 = createTestPlayer({ id: 'p1', position: { x: 1, y: 1 } });
        const player2 = createTestPlayer({ id: 'p2', position: { x: 3, y: 1 } });
        const player3 = createTestPlayer({ id: 'p3', position: { x: 7, y: 5 } });

        const gameView = createGameView({
          players: [player1, player2, player3],
        });

        const nearest = findNearestPlayer(gameView, 'p1');
        expect(nearest?.id).toBe('p2');
      });

      it('should return null when no other players', () => {
        const player1 = createTestPlayer({ id: 'p1' });
        const gameView = createGameView({ players: [player1] });

        const nearest = findNearestPlayer(gameView, 'p1');
        expect(nearest).toBeNull();
      });

      it('should ignore dead players', () => {
        const player1 = createTestPlayer({ id: 'p1', position: { x: 1, y: 1 } });
        const player2 = createTestPlayer({ id: 'p2', position: { x: 2, y: 1 }, alive: false });
        const player3 = createTestPlayer({ id: 'p3', position: { x: 7, y: 5 }, alive: true });

        const gameView = createGameView({
          players: [player1, player2, player3],
        });

        const nearest = findNearestPlayer(gameView, 'p1');
        expect(nearest?.id).toBe('p3');
      });
    });

    describe('findWeakestPlayer', () => {
      it('should find player with fewest ability upgrades', () => {
        const player1 = createTestPlayer({
          id: 'p1',
          abilities: { bomb_count: { level: 3 } },
        });
        const player2 = createTestPlayer({
          id: 'p2',
          abilities: { speed: { level: 1 } },
        });
        const player3 = createTestPlayer({
          id: 'p3',
          abilities: { blast_radius: { level: 2 } },
        });

        const gameView = createGameView({
          players: [player1, player2, player3],
        });

        const weakest = findWeakestPlayer(gameView, 'p1');
        expect(weakest?.id).toBe('p2');
      });
    });

    describe('getOtherPlayers', () => {
      it('should return all other alive players', () => {
        const player1 = createTestPlayer({ id: 'p1' });
        const player2 = createTestPlayer({ id: 'p2' });
        const player3 = createTestPlayer({ id: 'p3', alive: false });

        const gameView = createGameView({
          players: [player1, player2, player3],
        });

        const others = getOtherPlayers(gameView, 'p1');
        expect(others.length).toBe(1);
        expect(others[0].id).toBe('p2');
      });
    });

    describe('findNearestDestructible', () => {
      it('should find nearest destructible block', () => {
        const gameView = createGameView();
        gameView.grid[3][5] = 'destructible';
        gameView.grid[7][7] = 'destructible';

        const nearest = findNearestDestructible({ x: 1, y: 1 }, gameView);
        expect(nearest).toEqual({ x: 5, y: 3 });
      });

      it('should return null when no destructible blocks', () => {
        const gameView = createGameView();
        const nearest = findNearestDestructible({ x: 1, y: 1 }, gameView);
        expect(nearest).toBeNull();
      });
    });

    describe('findNearestPowerUp', () => {
      it('should find nearest power-up', () => {
        const gameView = createGameView({
          powerUps: [
            { id: 'pu1', position: { x: 3, y: 3 }, choices: ['speed', 'bomb_count'] },
            { id: 'pu2', position: { x: 7, y: 7 }, choices: ['blast_radius'] },
          ],
        });

        const nearest = findNearestPowerUp({ x: 1, y: 1 }, gameView);
        expect(nearest).toEqual({ x: 3, y: 3 });
      });

      it('should return null when no power-ups', () => {
        const gameView = createGameView({ powerUps: [] });
        const nearest = findNearestPowerUp({ x: 1, y: 1 }, gameView);
        expect(nearest).toBeNull();
      });

      it('should filter by type when specified', () => {
        const gameView = createGameView({
          powerUps: [
            { id: 'pu1', position: { x: 2, y: 2 }, choices: ['speed'] },
            { id: 'pu2', position: { x: 5, y: 5 }, choices: ['bomb_count', 'blast_radius'] },
          ],
        });

        const nearest = findNearestPowerUp({ x: 1, y: 1 }, gameView, 'bomb_count');
        expect(nearest).toEqual({ x: 5, y: 5 });
      });
    });
  });
});
