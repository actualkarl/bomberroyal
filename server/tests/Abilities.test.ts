import { describe, it, expect, beforeEach } from 'vitest';
import { Player, Cell } from '@bomberroyal/shared';
import { BombCountAbility } from '../src/abilities/BombCountAbility.js';
import { BlastRadiusAbility } from '../src/abilities/BlastRadiusAbility.js';
import { BombKickAbility } from '../src/abilities/BombKickAbility.js';
import { RemoteDetonateAbility } from '../src/abilities/RemoteDetonateAbility.js';
import { SpeedAbility } from '../src/abilities/SpeedAbility.js';
import { ShieldAbility } from '../src/abilities/ShieldAbility.js';
import { PiercingBombAbility } from '../src/abilities/PiercingBombAbility.js';
import { EagleEyeAbility } from '../src/abilities/EagleEyeAbility.js';
import { QuickFuseAbility } from '../src/abilities/QuickFuseAbility.js';
import { SPEED_MULTIPLIERS, KICK_DISTANCES, FUSE_TIMES, EAGLE_EYE_BONUS } from '@bomberroyal/shared';

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

describe('Abilities', () => {
  describe('BombCountAbility', () => {
    const ability = new BombCountAbility();

    it('should have correct id and name', () => {
      expect(ability.id).toBe('bomb_count');
      expect(ability.name).toBe('Bomb Count');
    });

    it('should have 4 tiers (0-3)', () => {
      expect(ability.tiers.length).toBe(4);
    });

    it('should upgrade maxBombs correctly', () => {
      const player = createTestPlayer();

      expect(player.maxBombs).toBe(1);

      ability.onUpgrade(player, 1);
      expect(player.maxBombs).toBe(2);

      ability.onUpgrade(player, 2);
      expect(player.maxBombs).toBe(3);

      ability.onUpgrade(player, 3);
      expect(player.maxBombs).toBe(4);
    });
  });

  describe('BlastRadiusAbility', () => {
    const ability = new BlastRadiusAbility();

    it('should have correct id and name', () => {
      expect(ability.id).toBe('blast_radius');
      expect(ability.name).toBe('Blast Radius');
    });

    it('should upgrade blastRadius correctly', () => {
      const player = createTestPlayer();

      expect(player.blastRadius).toBe(1);

      ability.onUpgrade(player, 1);
      expect(player.blastRadius).toBe(2);

      ability.onUpgrade(player, 2);
      expect(player.blastRadius).toBe(3);

      ability.onUpgrade(player, 3);
      expect(player.blastRadius).toBe(4);
    });
  });

  describe('BombKickAbility', () => {
    const ability = new BombKickAbility();

    it('should have correct id and name', () => {
      expect(ability.id).toBe('bomb_kick');
      expect(ability.name).toBe('Bomb Kick');
    });

    it('should enable kick at level 1', () => {
      const player = createTestPlayer();

      expect(player.canKickBombs).toBe(false);
      expect(player.kickLevel).toBe(0);

      ability.onUpgrade(player, 1);
      expect(player.canKickBombs).toBe(true);
      expect(player.kickLevel).toBe(1);
    });

    it('should return correct kick distances', () => {
      expect(BombKickAbility.getKickDistance(0)).toBe(KICK_DISTANCES[0]);
      expect(BombKickAbility.getKickDistance(1)).toBe(KICK_DISTANCES[1]);
      expect(BombKickAbility.getKickDistance(2)).toBe(KICK_DISTANCES[2]);
      expect(BombKickAbility.getKickDistance(3)).toBe(KICK_DISTANCES[3]);
    });

    it('should only allow stopping kick at level 3', () => {
      expect(BombKickAbility.canStopKick(0)).toBe(false);
      expect(BombKickAbility.canStopKick(1)).toBe(false);
      expect(BombKickAbility.canStopKick(2)).toBe(false);
      expect(BombKickAbility.canStopKick(3)).toBe(true);
    });
  });

  describe('RemoteDetonateAbility', () => {
    const ability = new RemoteDetonateAbility();
    const mockGrid: Cell[][] = [];
    const mockLineOfSight = () => true;

    it('should have correct id and name', () => {
      expect(ability.id).toBe('remote_detonate');
      expect(ability.name).toBe('Remote Detonate');
    });

    it('should enable remote detonate at level 1', () => {
      const player = createTestPlayer();

      expect(player.canRemoteDetonate).toBe(false);

      ability.onUpgrade(player, 1);
      expect(player.canRemoteDetonate).toBe(true);
      expect(player.remoteDetonateLevel).toBe(1);
    });

    it('should not allow detonation at level 0', () => {
      const player = createTestPlayer();
      const canDetonate = RemoteDetonateAbility.canDetonateBomb(
        player, 'player-1', { x: 1, y: 1 }, 0, mockGrid, mockLineOfSight
      );
      expect(canDetonate).toBe(false);
    });

    it('should only detonate own bombs at level 1-2', () => {
      const player = createTestPlayer();

      // Own bomb
      expect(RemoteDetonateAbility.canDetonateBomb(
        player, 'player-1', { x: 2, y: 2 }, 1, mockGrid, mockLineOfSight
      )).toBe(true);

      // Other player's bomb
      expect(RemoteDetonateAbility.canDetonateBomb(
        player, 'player-2', { x: 2, y: 2 }, 1, mockGrid, mockLineOfSight
      )).toBe(false);
    });

    it('should detonate any bomb in LOS at level 3', () => {
      const player = createTestPlayer();

      // Other player's bomb with line of sight
      expect(RemoteDetonateAbility.canDetonateBomb(
        player, 'player-2', { x: 2, y: 2 }, 3, mockGrid, mockLineOfSight
      )).toBe(true);
    });
  });

  describe('SpeedAbility', () => {
    const ability = new SpeedAbility();

    it('should have correct id and name', () => {
      expect(ability.id).toBe('speed');
      expect(ability.name).toBe('Speed');
    });

    it('should upgrade speed correctly', () => {
      const player = createTestPlayer();

      ability.onUpgrade(player, 0);
      expect(player.speed).toBe(SPEED_MULTIPLIERS[0]);

      ability.onUpgrade(player, 1);
      expect(player.speed).toBe(SPEED_MULTIPLIERS[1]);

      ability.onUpgrade(player, 2);
      expect(player.speed).toBe(SPEED_MULTIPLIERS[2]);

      ability.onUpgrade(player, 3);
      expect(player.speed).toBe(SPEED_MULTIPLIERS[3]);
    });

    it('should return correct speed multipliers', () => {
      expect(SpeedAbility.getSpeedMultiplier(0)).toBe(1.0);
      expect(SpeedAbility.getSpeedMultiplier(1)).toBe(1.15);
      expect(SpeedAbility.getSpeedMultiplier(2)).toBe(1.30);
      expect(SpeedAbility.getSpeedMultiplier(3)).toBe(1.45);
    });
  });

  describe('ShieldAbility', () => {
    const ability = new ShieldAbility();

    it('should have correct id and name', () => {
      expect(ability.id).toBe('shield');
      expect(ability.name).toBe('Shield');
    });

    it('should grant shield at level 1', () => {
      const player = createTestPlayer();

      expect(player.hasShield).toBe(false);

      ability.onUpgrade(player, 1);
      expect(player.hasShield).toBe(true);
    });

    it('should only have 2 tiers (0 and 1)', () => {
      expect(ability.tiers.length).toBe(2);
    });
  });

  describe('PiercingBombAbility', () => {
    const ability = new PiercingBombAbility();

    it('should have correct id and name', () => {
      expect(ability.id).toBe('piercing_bomb');
      expect(ability.name).toBe('Piercing Bomb');
    });

    it('should report piercing correctly', () => {
      const player = createTestPlayer({ abilities: {} });
      expect(PiercingBombAbility.hasPiercing(player)).toBe(false);

      const playerWithPiercing = createTestPlayer({
        abilities: { piercing_bomb: { level: 1 } },
      });
      expect(PiercingBombAbility.hasPiercing(playerWithPiercing)).toBe(true);
    });

    it('should only have 2 tiers (0 and 1)', () => {
      expect(ability.tiers.length).toBe(2);
    });
  });

  describe('EagleEyeAbility', () => {
    const ability = new EagleEyeAbility();

    it('should have correct id and name', () => {
      expect(ability.id).toBe('eagle_eye');
      expect(ability.name).toBe('Eagle Eye');
    });

    it('should return correct fog radius', () => {
      // getFogRadius returns DEFAULT_FOG_RADIUS + bonus
      expect(EagleEyeAbility.getFogRadius(0)).toBe(5 + EAGLE_EYE_BONUS[0]);
      expect(EagleEyeAbility.getFogRadius(1)).toBe(5 + EAGLE_EYE_BONUS[1]);
      expect(EagleEyeAbility.getFogRadius(2)).toBe(5 + EAGLE_EYE_BONUS[2]);
    });

    it('should have 3 tiers (0-2)', () => {
      expect(ability.tiers.length).toBe(3);
    });
  });

  describe('QuickFuseAbility', () => {
    const ability = new QuickFuseAbility();

    it('should have correct id and name', () => {
      expect(ability.id).toBe('quick_fuse');
      expect(ability.name).toBe('Quick Fuse');
    });

    it('should return correct fuse times', () => {
      expect(QuickFuseAbility.getFuseTime(0)).toBe(FUSE_TIMES[0]); // 3000ms
      expect(QuickFuseAbility.getFuseTime(1)).toBe(FUSE_TIMES[1]); // 2500ms
      expect(QuickFuseAbility.getFuseTime(2)).toBe(FUSE_TIMES[2]); // 2000ms
      expect(QuickFuseAbility.getFuseTime(3)).toBe(FUSE_TIMES[3]); // 1500ms
    });

    it('should have 4 tiers (0-3)', () => {
      expect(ability.tiers.length).toBe(4);
    });
  });
});
