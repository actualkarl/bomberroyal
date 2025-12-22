import { Player } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier } from './BaseAbility.js';

export class BombCountAbility extends BaseAbility {
  id = 'bomb_count' as const;
  name = 'Bomb Count';
  description = 'Increase maximum simultaneous bombs';

  tiers: AbilityTier[] = [
    { level: 0, effect: '1 bomb max' },
    { level: 1, effect: '2 bombs max' },
    { level: 2, effect: '3 bombs max' },
    { level: 3, effect: '4 bombs max', isUltimate: true },
  ];

  onUpgrade(player: Player, newLevel: number): void {
    // Level 0 = 1 bomb, Level 1 = 2 bombs, etc.
    player.maxBombs = 1 + newLevel;
  }
}
