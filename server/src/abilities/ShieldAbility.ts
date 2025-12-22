import { Player } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier } from './BaseAbility.js';

export class ShieldAbility extends BaseAbility {
  id = 'shield' as const;
  name = 'Shield';
  description = 'Survive one explosion';

  tiers: AbilityTier[] = [
    { level: 0, effect: 'No shield' },
    { level: 1, effect: 'Survive one explosion', isUltimate: true },
  ];

  onUpgrade(player: Player, newLevel: number): void {
    player.hasShield = newLevel > 0;
  }

  onLose(player: Player): void {
    player.hasShield = false;
    // Reset ability level when shield is consumed
    const abilities = player.abilities as Record<string, { level: number }>;
    if (abilities.shield) {
      abilities.shield.level = 0;
    }
  }
}
