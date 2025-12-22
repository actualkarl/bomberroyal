import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateGrid,
  isWalkable,
  isValidPosition,
  destroyBlock,
  SPAWN_POSITIONS,
} from '../src/game/Grid.js';
import { Cell } from '@bomberroyal/shared';

describe('Grid', () => {
  let grid: Cell[][];

  beforeEach(() => {
    // Use a seeded approach - generate grid fresh for each test
    grid = generateGrid(15, 13);
  });

  describe('generateGrid', () => {
    it('should create grid with correct dimensions', () => {
      expect(grid.length).toBe(13); // height
      expect(grid[0].length).toBe(15); // width
    });

    it('should have indestructible border walls', () => {
      // Top and bottom rows
      for (let x = 0; x < 15; x++) {
        expect(grid[0][x]).toBe('indestructible');
        expect(grid[12][x]).toBe('indestructible');
      }
      // Left and right columns
      for (let y = 0; y < 13; y++) {
        expect(grid[y][0]).toBe('indestructible');
        expect(grid[y][14]).toBe('indestructible');
      }
    });

    it('should have checkered indestructible blocks', () => {
      // Even x, even y positions should be indestructible
      expect(grid[2][2]).toBe('indestructible');
      expect(grid[4][4]).toBe('indestructible');
      expect(grid[2][4]).toBe('indestructible');
    });

    it('should have empty cells at spawn positions', () => {
      for (const spawn of SPAWN_POSITIONS) {
        expect(grid[spawn.y][spawn.x]).toBe('empty');
      }
    });

    it('should have empty safe zone around spawn positions', () => {
      // Check first spawn position (1, 1)
      const spawn = SPAWN_POSITIONS[0];

      // 3x3 area should be empty (except for checkered indestructible blocks)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const x = spawn.x + dx;
          const y = spawn.y + dy;
          // Skip border cells
          if (x === 0 || y === 0) continue;
          // Skip checkered indestructible positions (even x, even y)
          if (x % 2 === 0 && y % 2 === 0) continue;
          const cell = grid[y]?.[x];
          expect(cell).toBe('empty');
        }
      }
    });

    it('should generate custom sized grids', () => {
      const smallGrid = generateGrid(9, 9);
      expect(smallGrid.length).toBe(9);
      expect(smallGrid[0].length).toBe(9);
    });
  });

  describe('isWalkable', () => {
    it('should return true for empty cells', () => {
      // Spawn positions are always empty
      expect(isWalkable(grid, 1, 1)).toBe(true);
    });

    it('should return false for indestructible blocks', () => {
      expect(isWalkable(grid, 0, 0)).toBe(false);
      expect(isWalkable(grid, 2, 2)).toBe(false);
    });

    it('should return false for out of bounds positions', () => {
      expect(isWalkable(grid, -1, 0)).toBe(false);
      expect(isWalkable(grid, 0, -1)).toBe(false);
      expect(isWalkable(grid, 20, 0)).toBe(false);
      expect(isWalkable(grid, 0, 20)).toBe(false);
    });

    it('should return false for destructible blocks', () => {
      // Find a destructible block
      let foundDestructible = false;
      for (let y = 0; y < grid.length && !foundDestructible; y++) {
        for (let x = 0; x < grid[y].length && !foundDestructible; x++) {
          if (grid[y][x] === 'destructible') {
            expect(isWalkable(grid, x, y)).toBe(false);
            foundDestructible = true;
          }
        }
      }
      // Grid should have some destructible blocks
      expect(foundDestructible).toBe(true);
    });
  });

  describe('isValidPosition', () => {
    it('should return true for positions within grid', () => {
      expect(isValidPosition(grid, 0, 0)).toBe(true);
      expect(isValidPosition(grid, 7, 6)).toBe(true);
      expect(isValidPosition(grid, 14, 12)).toBe(true);
    });

    it('should return false for positions outside grid', () => {
      expect(isValidPosition(grid, -1, 0)).toBe(false);
      expect(isValidPosition(grid, 0, -1)).toBe(false);
      expect(isValidPosition(grid, 15, 0)).toBe(false);
      expect(isValidPosition(grid, 0, 13)).toBe(false);
    });
  });

  describe('destroyBlock', () => {
    it('should destroy destructible blocks', () => {
      // Find a destructible block
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          if (grid[y][x] === 'destructible') {
            expect(destroyBlock(grid, x, y)).toBe(true);
            expect(grid[y][x]).toBe('empty');
            return; // Test complete
          }
        }
      }
    });

    it('should not destroy indestructible blocks', () => {
      expect(destroyBlock(grid, 0, 0)).toBe(false);
      expect(grid[0][0]).toBe('indestructible');
    });

    it('should not destroy empty cells', () => {
      expect(destroyBlock(grid, 1, 1)).toBe(false);
      expect(grid[1][1]).toBe('empty');
    });

    it('should return false for invalid positions', () => {
      expect(destroyBlock(grid, -1, 0)).toBe(false);
      expect(destroyBlock(grid, 100, 100)).toBe(false);
    });
  });

  describe('SPAWN_POSITIONS', () => {
    it('should have 4 spawn positions', () => {
      expect(SPAWN_POSITIONS.length).toBe(4);
    });

    it('should have spawn positions in corners', () => {
      // Top-left
      expect(SPAWN_POSITIONS[0]).toEqual({ x: 1, y: 1 });
      // Top-right
      expect(SPAWN_POSITIONS[1]).toEqual({ x: 13, y: 1 });
      // Bottom-left
      expect(SPAWN_POSITIONS[2]).toEqual({ x: 1, y: 11 });
      // Bottom-right
      expect(SPAWN_POSITIONS[3]).toEqual({ x: 13, y: 11 });
    });
  });
});
