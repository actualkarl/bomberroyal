import { Player, Cell } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier } from './BaseAbility.js';

export class RemoteDetonateAbility extends BaseAbility {
  id = 'remote_detonate' as const;
  name = 'Remote Detonate';
  description = 'Detonate bombs on demand';

  tiers: AbilityTier[] = [
    { level: 0, effect: 'Cannot remote detonate' },
    { level: 1, effect: 'Detonate your own bombs' },
    { level: 2, effect: 'Detonate from further away' },
    { level: 3, effect: 'Detonate ANY bomb in line of sight', isUltimate: true },
  ];

  onUpgrade(player: Player, newLevel: number): void {
    player.canRemoteDetonate = newLevel > 0;
    player.remoteDetonateLevel = newLevel;
  }

  // Check if player can detonate a specific bomb at a specific level
  static canDetonateBomb(
    player: Player,
    bombOwnerId: string,
    bombPosition: { x: number; y: number },
    level: number,
    grid: Cell[][],
    hasLineOfSight: (from: { x: number; y: number }, to: { x: number; y: number }, grid: Cell[][]) => boolean
  ): boolean {
    if (level === 0) return false;

    // Level 1-2: Only own bombs
    if (level < 3) {
      return bombOwnerId === player.id;
    }

    // Level 3: Any bomb in line of sight
    return hasLineOfSight(player.position, bombPosition, grid);
  }
}
