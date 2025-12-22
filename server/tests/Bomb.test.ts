import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  placeBomb,
  kickBomb,
  processSlidingBombs,
  tryKickBomb,
  stopBombSlide,
  processExplodingBombs,
  calculateExplosionCells,
  createExplosion,
  processExplosionDestruction,
  returnBombToPlayer,
} from '../src/game/Bomb.js';
import { Bomb, Cell, Player } from '@bomberroyal/shared';
import { generateGrid } from '../src/game/Grid.js';

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
    blastRadius: 2,
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

describe('Bomb', () => {
  let grid: Cell[][];
  let bombs: Map<string, Bomb>;
  let players: Player[];

  beforeEach(() => {
    grid = generateGrid(15, 13);
    bombs = new Map();
    players = [createTestPlayer()];
  });

  describe('placeBomb', () => {
    it('should place a bomb at player position', () => {
      const player = players[0];
      const bomb = placeBomb(player, bombs);

      expect(bomb).not.toBeNull();
      expect(bomb!.position.x).toBe(player.position.x);
      expect(bomb!.position.y).toBe(player.position.y);
      expect(bomb!.ownerId).toBe(player.id);
      expect(bomb!.blastRadius).toBe(player.blastRadius);
    });

    it('should increment player bomb count', () => {
      const player = players[0];
      expect(player.bombCount).toBe(0);

      placeBomb(player, bombs);
      expect(player.bombCount).toBe(1);
    });

    it('should increment bombsPlaced stat', () => {
      const player = players[0];
      expect(player.stats.bombsPlaced).toBe(0);

      placeBomb(player, bombs);
      expect(player.stats.bombsPlaced).toBe(1);
    });

    it('should not place bomb if at max capacity', () => {
      const player = players[0];
      player.maxBombs = 1;

      placeBomb(player, bombs);
      const secondBomb = placeBomb(player, bombs);

      expect(secondBomb).toBeNull();
      expect(player.bombCount).toBe(1);
    });

    it('should not place bomb if one already exists at position', () => {
      const player = players[0];
      player.maxBombs = 2;

      const firstBomb = placeBomb(player, bombs);
      const secondBomb = placeBomb(player, bombs);

      expect(firstBomb).not.toBeNull();
      expect(secondBomb).toBeNull();
    });

    it('should add bomb to bombs map', () => {
      const player = players[0];
      const bomb = placeBomb(player, bombs);

      expect(bombs.size).toBe(1);
      expect(bombs.has(bomb!.id)).toBe(true);
    });

    it('should set default fuse time', () => {
      const player = players[0];
      const bomb = placeBomb(player, bombs);

      expect(bomb!.fuseTime).toBe(3000); // Default fuse time
    });
  });

  describe('kickBomb', () => {
    it('should set bomb sliding state', () => {
      const player = players[0];
      const bomb = placeBomb(player, bombs)!;

      kickBomb(bomb, 'right', 1, 'player-1');

      expect(bomb.isSliding).toBe(true);
      expect(bomb.slideDirection).toBe('right');
      expect(bomb.kickedBy).toBe('player-1');
    });

    it('should not kick if kick level is 0', () => {
      const player = players[0];
      const bomb = placeBomb(player, bombs)!;

      kickBomb(bomb, 'right', 0, 'player-1');

      expect(bomb.isSliding).toBe(false);
    });
  });

  describe('stopBombSlide', () => {
    it('should stop a sliding bomb', () => {
      const player = players[0];
      const bomb = placeBomb(player, bombs)!;

      kickBomb(bomb, 'right', 1, 'player-1');
      expect(bomb.isSliding).toBe(true);

      stopBombSlide(bomb);
      expect(bomb.isSliding).toBe(false);
      expect(bomb.slideDirection).toBeNull();
      expect(bomb.slideProgress).toBe(0);
    });
  });

  describe('processSlidingBombs', () => {
    it('should move sliding bomb toward target', () => {
      // Use a safe position in the middle of the map with clear path
      const player = createTestPlayer({ position: { x: 5, y: 3 } });
      players = [player];

      // Ensure path is clear
      grid[3][5] = 'empty';
      grid[3][6] = 'empty';
      grid[3][7] = 'empty';

      const bomb = placeBomb(player, bombs)!;
      const initialX = bomb.position.x;

      kickBomb(bomb, 'right', 1, 'player-1');

      // Process with enough time to move 1 tile (5 tiles/sec = 200ms per tile)
      // Run multiple iterations
      for (let i = 0; i < 5; i++) {
        processSlidingBombs(bombs, grid, 100, players);
      }

      // Bomb should have moved at least 1 tile right
      expect(bomb.position.x).toBeGreaterThan(initialX);
    });

    it('should stop at obstacles', () => {
      const player = createTestPlayer({ position: { x: 1, y: 1 } });
      players = [player];
      const bomb = placeBomb(player, bombs)!;

      // Kick toward border wall
      kickBomb(bomb, 'left', 1, 'player-1');
      processSlidingBombs(bombs, grid, 500, players);

      // Should stop at x=1 (wall at x=0)
      expect(bomb.position.x).toBe(1);
      expect(bomb.isSliding).toBe(false);
    });
  });

  describe('tryKickBomb', () => {
    it('should kick bomb when player walks into it', () => {
      // Position at (5,1) to (6,1) - in open space away from edges
      const player = createTestPlayer({
        position: { x: 5, y: 1 },
        canKickBombs: true,
        kickLevel: 1,
      });
      const bombOwner = createTestPlayer({
        id: 'player-2',
        position: { x: 6, y: 1 },
      });

      const bomb = placeBomb(bombOwner, bombs)!;
      // Remove bomb owner from position so next cell is clear
      bombOwner.position = { x: 10, y: 1 };
      players = [player, bombOwner];

      // Ensure target cell (7,1) is empty
      grid[1][7] = 'empty';

      // Player at (5,1) walks right toward bomb at (6,1)
      const kicked = tryKickBomb(player, 6, 1, 'right', bombs, grid, players);

      expect(kicked).toBe(true);
      expect(bomb.isSliding).toBe(true);
      expect(bomb.slideDirection).toBe('right');
    });

    it('should not kick if player cannot kick', () => {
      const player = createTestPlayer({
        position: { x: 3, y: 1 },
        canKickBombs: false,
      });
      const bombOwner = createTestPlayer({
        id: 'player-2',
        position: { x: 4, y: 1 },
      });

      placeBomb(bombOwner, bombs);
      players = [player, bombOwner];

      const kicked = tryKickBomb(player, 4, 1, 'right', bombs, grid, players);
      expect(kicked).toBe(false);
    });
  });

  describe('processExplodingBombs', () => {
    it('should return bombs that have exceeded fuse time', () => {
      const player = players[0];
      const bomb = placeBomb(player, bombs)!;

      // Immediately after placement
      let exploding = processExplodingBombs(bombs, Date.now());
      expect(exploding.length).toBe(0);

      // After fuse time
      exploding = processExplodingBombs(bombs, Date.now() + 4000);
      expect(exploding.length).toBe(1);
      expect(exploding[0].id).toBe(bomb.id);
    });
  });

  describe('calculateExplosionCells', () => {
    it('should include center cell', () => {
      const player = createTestPlayer({ position: { x: 3, y: 3 }, blastRadius: 2 });
      const bomb = placeBomb(player, bombs)!;

      const cells = calculateExplosionCells(bomb, grid, bombs);

      expect(cells.some((c) => c.x === 3 && c.y === 3)).toBe(true);
    });

    it('should spread in all 4 directions', () => {
      const player = createTestPlayer({ position: { x: 7, y: 5 }, blastRadius: 2 });
      const bomb = placeBomb(player, bombs)!;

      const cells = calculateExplosionCells(bomb, grid, bombs);

      // Check each direction
      expect(cells.some((c) => c.x === 7 && c.y === 4)).toBe(true); // up
      expect(cells.some((c) => c.x === 7 && c.y === 6)).toBe(true); // down
      expect(cells.some((c) => c.x === 6 && c.y === 5)).toBe(true); // left
      expect(cells.some((c) => c.x === 8 && c.y === 5)).toBe(true); // right
    });

    it('should stop at indestructible blocks', () => {
      const player = createTestPlayer({ position: { x: 3, y: 3 }, blastRadius: 5 });
      const bomb = placeBomb(player, bombs)!;

      const cells = calculateExplosionCells(bomb, grid, bombs);

      // Should not include border walls
      expect(cells.some((c) => c.x === 0)).toBe(false);
      expect(cells.some((c) => c.y === 0)).toBe(false);
    });

    it('should stop at destructible blocks unless piercing', () => {
      // Set up a destructible block
      grid[3][4] = 'destructible';

      const player = createTestPlayer({ position: { x: 3, y: 3 }, blastRadius: 3 });
      const bomb = placeBomb(player, bombs)!;
      bomb.isPiercing = false;

      const cells = calculateExplosionCells(bomb, grid, bombs);

      // Should include the destructible block
      expect(cells.some((c) => c.x === 4 && c.y === 3)).toBe(true);
      // Should not include beyond the destructible block
      expect(cells.some((c) => c.x === 5 && c.y === 3)).toBe(false);
    });

    it('should pierce through destructible blocks when isPiercing is true', () => {
      grid[3][4] = 'destructible';
      grid[3][5] = 'empty';

      const player = createTestPlayer({ position: { x: 3, y: 3 }, blastRadius: 3 });
      const bomb = placeBomb(player, bombs)!;
      bomb.isPiercing = true;

      const cells = calculateExplosionCells(bomb, grid, bombs);

      expect(cells.some((c) => c.x === 4 && c.y === 3)).toBe(true);
      expect(cells.some((c) => c.x === 5 && c.y === 3)).toBe(true);
    });
  });

  describe('createExplosion', () => {
    it('should create explosion with correct properties', () => {
      const player = players[0];
      const bomb = placeBomb(player, bombs)!;
      const cells = [{ x: 1, y: 1 }];

      const explosion = createExplosion(bomb, cells);

      expect(explosion.id).toContain('exp-');
      expect(explosion.cells).toEqual(cells);
      expect(explosion.ownerId).toBe(player.id);
      expect(explosion.duration).toBe(500);
    });
  });

  describe('processExplosionDestruction', () => {
    it('should destroy destructible blocks', () => {
      grid[3][3] = 'destructible';

      const player = createTestPlayer({ position: { x: 3, y: 3 } });
      const bomb = placeBomb(player, bombs)!;
      const explosion = createExplosion(bomb, [{ x: 3, y: 3 }]);

      const result = processExplosionDestruction(explosion, grid, players, bombs);

      expect(result.destroyedBlocks.length).toBe(1);
      expect(grid[3][3]).toBe('empty');
    });

    it('should kill players in explosion', () => {
      const player = createTestPlayer({ position: { x: 3, y: 3 }, alive: true });
      players = [player];

      const bomb = placeBomb(player, bombs)!;
      const explosion = createExplosion(bomb, [{ x: 3, y: 3 }]);

      const result = processExplosionDestruction(explosion, grid, players, bombs);

      expect(result.killedPlayers.length).toBe(1);
      expect(player.alive).toBe(false);
      expect(player.stats.deaths).toBe(1);
    });

    it('should consume shield instead of killing player', () => {
      const player = createTestPlayer({
        position: { x: 3, y: 3 },
        alive: true,
        hasShield: true,
        powerUps: [{ type: 'shield', collectedAt: Date.now() }],
        abilities: { shield: { level: 1 } },
      });
      players = [player];

      const bomb = placeBomb(player, bombs)!;
      const explosion = createExplosion(bomb, [{ x: 3, y: 3 }]);

      const result = processExplosionDestruction(explosion, grid, players, bombs);

      expect(result.killedPlayers.length).toBe(0);
      expect(player.alive).toBe(true);
      expect(player.hasShield).toBe(false);
    });

    it('should trigger chain reactions for bombs in blast', () => {
      const player1 = createTestPlayer({ id: 'p1', position: { x: 3, y: 3 } });
      const player2 = createTestPlayer({ id: 'p2', position: { x: 4, y: 3 } });
      players = [player1, player2];

      const bomb1 = placeBomb(player1, bombs)!;
      const bomb2 = placeBomb(player2, bombs)!;

      const explosion = createExplosion(bomb1, [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
      ]);

      const result = processExplosionDestruction(explosion, grid, players, bombs);

      expect(result.chainedBombs.length).toBe(2);
    });
  });

  describe('returnBombToPlayer', () => {
    it('should decrement player bomb count', () => {
      const player = players[0];
      const bomb = placeBomb(player, bombs)!;

      expect(player.bombCount).toBe(1);

      returnBombToPlayer(bomb, players);

      expect(player.bombCount).toBe(0);
    });

    it('should not go below 0', () => {
      const player = players[0];
      player.bombCount = 0;

      const fakeBomb: Bomb = {
        id: 'fake',
        ownerId: player.id,
        position: { x: 1, y: 1 },
        blastRadius: 2,
        placedAt: Date.now(),
        fuseTime: 3000,
        isPiercing: false,
        isSliding: false,
        slideDirection: null,
        slideProgress: 0,
        kickedBy: null,
      };

      returnBombToPlayer(fakeBomb, players);
      expect(player.bombCount).toBe(0);
    });
  });
});
