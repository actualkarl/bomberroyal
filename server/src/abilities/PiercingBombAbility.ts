import { Player } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier } from './BaseAbility.js';

export class PiercingBombAbility extends BaseAbility {
  id = 'piercing_bomb' as const;
  name = 'Piercing Bomb';
  description = 'Bombs pierce through destructible blocks';

  tiers: AbilityTier[] = [
    { level: 0, effect: 'Normal explosions' },
    { level: 1, effect: 'Explosions pierce through blocks', isUltimate: true },
  ];

  onUpgrade(player: Player, _newLevel: number): void {
    // The isPiercing flag is set on bomb placement, not on player
    // This is handled in the bomb placement logic
  }

  static hasPiercing(player: Player): boolean {
    const abilities = player.abilities as Record<string, { level: number }>;
    return (abilities.piercing_bomb?.level ?? 0) > 0;
  }
}
