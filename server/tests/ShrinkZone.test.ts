import { describe, it, expect, beforeEach } from 'vitest';
import { Room, Cell, Player } from '@bomberroyal/shared';
import {
  processShrinkZone,
  isInSafeZone,
  getTimeUntilShrink,
} from '../src/game/ShrinkZone.js';
import { generateGrid } from '../src/game/Grid.js';
import { SHRINK_AMOUNT } from '@bomberroyal/shared';

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

// Helper to create a test room
function createTestRoom(overrides: Partial<Room> = {}): Room {
  const grid = generateGrid(15, 13);
  return {
    code: 'TEST01',
    hostId: 'player-1',
    players: [createTestPlayer()],
    gameState: {
      phase: 'PLAYING',
      tick: 0,
      grid,
      bombs: [],
      explosions: [],
      powerUps: [],
      startedAt: Date.now() - 1000, // Started 1 second ago
      shrinkZone: {
        active: false,
        currentBounds: {
          minX: 0,
          maxX: 14,
          minY: 0,
          maxY: 12,
        },
        shrinkInterval: 10000,
        nextShrinkAt: 0,
      },
    },
    settings: {
      gridSize: { width: 15, height: 13 },
      maxPlayers: 4,
      shrinkStartDelay: 60000, // 60 seconds
    },
    createdAt: Date.now(),
    ...overrides,
  } as Room;
}

describe('ShrinkZone', () => {
  describe('processShrinkZone', () => {
    it('should not activate before shrink start delay', () => {
      const room = createTestRoom();
      const currentTime = Date.now();

      const result = processShrinkZone(room, currentTime);

      expect(result.shrunk).toBe(false);
      expect(room.gameState.shrinkZone.active).toBe(false);
    });

    it('should activate after shrink start delay', () => {
      const room = createTestRoom();
      // Set startedAt to be before the delay
      room.gameState.startedAt = Date.now() - 70000; // 70 seconds ago
      const currentTime = Date.now();

      const result = processShrinkZone(room, currentTime);

      expect(room.gameState.shrinkZone.active).toBe(true);
      expect(result.shrunk).toBe(false); // First call just activates
    });

    it('should shrink when active and interval passed', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.active = true;
      room.gameState.shrinkZone.nextShrinkAt = Date.now() - 1000; // Past due

      const originalMinX = room.gameState.shrinkZone.currentBounds.minX;
      const result = processShrinkZone(room, Date.now());

      expect(result.shrunk).toBe(true);
      expect(room.gameState.shrinkZone.currentBounds.minX).toBe(originalMinX + SHRINK_AMOUNT);
    });

    it('should kill players in death zone', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.active = true;
      room.gameState.shrinkZone.nextShrinkAt = Date.now() - 1000;

      // Place player at edge (will be killed when zone shrinks)
      room.players[0].position = { x: 0, y: 6 };

      const result = processShrinkZone(room, Date.now());

      expect(result.killedPlayers.length).toBe(1);
      expect(room.players[0].alive).toBe(false);
    });

    it('should not kill players in safe zone', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.active = true;
      room.gameState.shrinkZone.nextShrinkAt = Date.now() - 1000;

      // Place player in center (safe zone)
      room.players[0].position = { x: 7, y: 6 };

      const result = processShrinkZone(room, Date.now());

      expect(result.killedPlayers.length).toBe(0);
      expect(room.players[0].alive).toBe(true);
    });

    it('should schedule next shrink', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.active = true;
      room.gameState.shrinkZone.nextShrinkAt = Date.now() - 1000;

      const currentTime = Date.now();
      processShrinkZone(room, currentTime);

      expect(room.gameState.shrinkZone.nextShrinkAt).toBeGreaterThan(currentTime);
    });

    it('should stop shrinking when bounds are too small', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.active = true;
      room.gameState.shrinkZone.nextShrinkAt = Date.now() - 1000;
      // Set bounds to minimum
      room.gameState.shrinkZone.currentBounds = {
        minX: 6,
        maxX: 8,
        minY: 5,
        maxY: 7,
      };

      const result = processShrinkZone(room, Date.now());

      expect(result.shrunk).toBe(false);
    });

    it('should mark cells as shrink_death', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.active = true;
      room.gameState.shrinkZone.nextShrinkAt = Date.now() - 1000;

      processShrinkZone(room, Date.now());

      // Edge cells should be marked as shrink_death
      expect(room.gameState.grid[6][0]).toBe('shrink_death');
    });
  });

  describe('isInSafeZone', () => {
    it('should return true for positions inside bounds', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.currentBounds = {
        minX: 2,
        maxX: 12,
        minY: 2,
        maxY: 10,
      };

      expect(isInSafeZone(room, 7, 6)).toBe(true);
      expect(isInSafeZone(room, 2, 2)).toBe(true);
      expect(isInSafeZone(room, 12, 10)).toBe(true);
    });

    it('should return false for positions outside bounds', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.currentBounds = {
        minX: 2,
        maxX: 12,
        minY: 2,
        maxY: 10,
      };

      expect(isInSafeZone(room, 0, 0)).toBe(false);
      expect(isInSafeZone(room, 14, 12)).toBe(false);
      expect(isInSafeZone(room, 1, 6)).toBe(false);
    });
  });

  describe('getTimeUntilShrink', () => {
    it('should return time until start when inactive', () => {
      const room = createTestRoom();
      room.gameState.startedAt = Date.now();
      room.settings.shrinkStartDelay = 60000;

      const timeUntil = getTimeUntilShrink(room, Date.now());

      expect(timeUntil).toBeCloseTo(60000, -2); // Within 100ms
    });

    it('should return time until next shrink when active', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.active = true;
      room.gameState.shrinkZone.nextShrinkAt = Date.now() + 5000;

      const timeUntil = getTimeUntilShrink(room, Date.now());

      expect(timeUntil).toBeCloseTo(5000, -2);
    });

    it('should return 0 when past shrink time', () => {
      const room = createTestRoom();
      room.gameState.shrinkZone.active = true;
      room.gameState.shrinkZone.nextShrinkAt = Date.now() - 1000;

      const timeUntil = getTimeUntilShrink(room, Date.now());

      expect(timeUntil).toBe(0);
    });
  });
});
