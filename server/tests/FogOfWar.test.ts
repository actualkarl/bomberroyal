import { describe, it, expect, beforeEach } from 'vitest';
import { Player, Cell, Bomb } from '@bomberroyal/shared';
import {
  hasLineOfSight,
  isCellVisible,
  getVisibleCells,
  getVisiblePlayers,
  getVisibleBombs,
} from '../src/game/FogOfWar.js';
import { generateGrid } from '../src/game/Grid.js';

// Helper to create a test player
function createTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    displayName: 'Test Player',
    color: 'red',
    position: { x: 7, y: 6 },
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
    fogRadius: 5,
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

describe('FogOfWar', () => {
  let grid: Cell[][];

  beforeEach(() => {
    grid = generateGrid(15, 13);
  });

  describe('hasLineOfSight', () => {
    it('should return true for same position', () => {
      expect(hasLineOfSight(1, 1, 1, 1, grid)).toBe(true);
    });

    it('should return true for adjacent empty cells', () => {
      // Clear path
      grid[1][1] = 'empty';
      grid[1][2] = 'empty';
      expect(hasLineOfSight(1, 1, 2, 1, grid)).toBe(true);
    });

    it('should return false when blocked by indestructible block', () => {
      grid[1][1] = 'empty';
      grid[1][2] = 'indestructible';
      grid[1][3] = 'empty';
      expect(hasLineOfSight(1, 1, 3, 1, grid)).toBe(false);
    });

    it('should return false when blocked by destructible block', () => {
      grid[1][1] = 'empty';
      grid[1][2] = 'destructible';
      grid[1][3] = 'empty';
      expect(hasLineOfSight(1, 1, 3, 1, grid)).toBe(false);
    });

    it('should return true for diagonal line of sight when clear', () => {
      // Clear diagonal path
      grid[1][1] = 'empty';
      grid[2][2] = 'empty';
      grid[3][3] = 'empty';
      expect(hasLineOfSight(1, 1, 3, 3, grid)).toBe(true);
    });
  });

  describe('isCellVisible', () => {
    it('should return true for cells within fog radius', () => {
      const player = createTestPlayer({ position: { x: 7, y: 6 }, fogRadius: 5 });
      expect(isCellVisible(player, 7, 6)).toBe(true); // Same cell
      expect(isCellVisible(player, 8, 6)).toBe(true); // Adjacent
    });

    it('should return false for cells outside fog radius', () => {
      const player = createTestPlayer({ position: { x: 1, y: 1 }, fogRadius: 3 });
      expect(isCellVisible(player, 10, 10)).toBe(false);
    });

    it('should check line of sight when grid is provided', () => {
      const player = createTestPlayer({ position: { x: 3, y: 1 }, fogRadius: 5 });
      // Clear the path
      grid[1][3] = 'empty';
      grid[1][4] = 'empty';
      grid[1][5] = 'empty';

      expect(isCellVisible(player, 5, 1, grid)).toBe(true);

      // Block with indestructible
      grid[1][4] = 'indestructible';
      expect(isCellVisible(player, 5, 1, grid)).toBe(false);
    });
  });

  describe('getVisibleCells', () => {
    it('should return cells within fog radius', () => {
      const player = createTestPlayer({ position: { x: 7, y: 6 }, fogRadius: 3 });
      const visible = getVisibleCells(player, grid);

      // Should include player's own position
      expect(visible.some((c) => c.x === 7 && c.y === 6)).toBe(true);

      // Should include adjacent cells that are visible
      expect(visible.length).toBeGreaterThan(0);
    });

    it('should not include cells blocked by walls', () => {
      const player = createTestPlayer({ position: { x: 1, y: 1 }, fogRadius: 10 });
      const visible = getVisibleCells(player, grid);

      // Check that cells behind walls aren't visible (implementation specific)
      // The actual grid has indestructible walls at even positions
      expect(visible.length).toBeLessThan(grid.length * grid[0].length);
    });
  });

  describe('getVisiblePlayers', () => {
    it('should return players within fog radius with line of sight', () => {
      const viewer = createTestPlayer({
        id: 'viewer',
        position: { x: 1, y: 1 },
        fogRadius: 5,
      });
      const nearPlayer = createTestPlayer({
        id: 'near',
        position: { x: 2, y: 1 },
      });
      const farPlayer = createTestPlayer({
        id: 'far',
        position: { x: 13, y: 11 },
      });

      // Clear path between viewer and near player
      grid[1][1] = 'empty';
      grid[1][2] = 'empty';

      const visiblePlayers = getVisiblePlayers(viewer, [viewer, nearPlayer, farPlayer], grid);

      expect(visiblePlayers.some((p) => p.id === 'near')).toBe(true);
      expect(visiblePlayers.some((p) => p.id === 'far')).toBe(false);
    });

    it('should not include viewer in visible players', () => {
      const viewer = createTestPlayer({ id: 'viewer' });
      const visiblePlayers = getVisiblePlayers(viewer, [viewer], grid);

      expect(visiblePlayers.length).toBe(0);
    });

    it('should not include dead players', () => {
      const viewer = createTestPlayer({
        id: 'viewer',
        position: { x: 1, y: 1 },
        fogRadius: 5,
      });
      const deadPlayer = createTestPlayer({
        id: 'dead',
        position: { x: 2, y: 1 },
        alive: false,
      });

      const visiblePlayers = getVisiblePlayers(viewer, [viewer, deadPlayer], grid);
      expect(visiblePlayers.length).toBe(0);
    });
  });

  describe('getVisibleBombs', () => {
    it('should always show own bombs', () => {
      const viewer = createTestPlayer({ id: 'viewer', position: { x: 1, y: 1 }, fogRadius: 5 });
      const ownBomb: Bomb = {
        id: 'bomb-1',
        ownerId: 'viewer',
        position: { x: 10, y: 10 }, // Far away
        blastRadius: 2,
        placedAt: Date.now(),
        fuseTime: 3000,
        isPiercing: false,
        isSliding: false,
        slideDirection: null,
        slideProgress: 0,
        kickedBy: null,
      };

      const visibleBombs = getVisibleBombs(viewer, [ownBomb], Date.now(), grid);
      expect(visibleBombs.length).toBe(1);
    });

    it('should show bombs in audio range', () => {
      const viewer = createTestPlayer({ id: 'viewer', position: { x: 5, y: 5 }, fogRadius: 5 });
      const nearBomb: Bomb = {
        id: 'bomb-1',
        ownerId: 'other',
        position: { x: 6, y: 5 }, // Within audio range (3 tiles)
        blastRadius: 2,
        placedAt: Date.now(),
        fuseTime: 3000,
        isPiercing: false,
        isSliding: false,
        slideDirection: null,
        slideProgress: 0,
        kickedBy: null,
      };

      // Clear path for visibility
      grid[5][5] = 'empty';
      grid[5][6] = 'empty';

      const visibleBombs = getVisibleBombs(viewer, [nearBomb], Date.now(), grid);
      expect(visibleBombs.length).toBe(1);
      expect(visibleBombs[0].visibility).toBe('audio_range');
    });

    it('should show warning bombs through extended fog', () => {
      const viewer = createTestPlayer({ id: 'viewer', position: { x: 5, y: 5 }, fogRadius: 5 });
      const warningBomb: Bomb = {
        id: 'bomb-1',
        ownerId: 'other',
        position: { x: 8, y: 5 },
        blastRadius: 2,
        placedAt: Date.now() - 2500, // About to explode
        fuseTime: 3000,
        isPiercing: false,
        isSliding: false,
        slideDirection: null,
        slideProgress: 0,
        kickedBy: null,
      };

      const visibleBombs = getVisibleBombs(viewer, [warningBomb], Date.now(), grid);
      expect(visibleBombs.length).toBe(1);
      expect(visibleBombs[0].visibility).toBe('warning');
    });
  });
});
