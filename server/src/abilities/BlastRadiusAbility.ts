import { Player } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier } from './BaseAbility.js';

export class BlastRadiusAbility extends BaseAbility {
  id = 'blast_radius' as const;
  name = 'Blast Radius';
  description = 'Increase explosion range';

  tiers: AbilityTier[] = [
    { level: 0, effect: '1 tile range' },
    { level: 1, effect: '2 tiles range' },
    { level: 2, effect: '3 tiles range' },
    { level: 3, effect: '4 tiles range', isUltimate: true },
  ];

  onUpgrade(player: Player, newLevel: number): void {
    // Level 0 = 1 tile, Level 1 = 2 tiles, etc.
    player.blastRadius = 1 + newLevel;
  }
}
