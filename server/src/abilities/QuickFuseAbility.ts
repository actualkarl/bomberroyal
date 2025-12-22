import { Player } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier } from './BaseAbility.js';
import { FUSE_TIMES } from '@bomberroyal/shared';

export class QuickFuseAbility extends BaseAbility {
  id = 'quick_fuse' as const;
  name = 'Quick Fuse';
  description = 'Reduce bomb fuse time';

  tiers: AbilityTier[] = [
    { level: 0, effect: `${FUSE_TIMES[0] / 1000}s fuse` },
    { level: 1, effect: `${FUSE_TIMES[1] / 1000}s fuse` },
    { level: 2, effect: `${FUSE_TIMES[2] / 1000}s fuse` },
    { level: 3, effect: `${FUSE_TIMES[3] / 1000}s fuse`, isUltimate: true },
  ];

  onUpgrade(_player: Player, _newLevel: number): void {
    // Fuse time is applied when placing bombs, not stored on player
  }

  static getFuseTime(level: number): number {
    return FUSE_TIMES[level] ?? FUSE_TIMES[0];
  }
}
