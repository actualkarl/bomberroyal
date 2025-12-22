import { Player } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier } from './BaseAbility.js';
import { EAGLE_EYE_BONUS, DEFAULT_FOG_RADIUS } from '@bomberroyal/shared';

export class EagleEyeAbility extends BaseAbility {
  id = 'eagle_eye' as const;
  name = 'Eagle Eye';
  description = 'Increase fog visibility range';

  tiers: AbilityTier[] = [
    { level: 0, effect: `${DEFAULT_FOG_RADIUS} tile visibility` },
    { level: 1, effect: `+${EAGLE_EYE_BONUS[1]} tile visibility` },
    { level: 2, effect: `+${EAGLE_EYE_BONUS[2]} tile visibility`, isUltimate: true },
  ];

  onUpgrade(player: Player, newLevel: number): void {
    player.fogRadius = DEFAULT_FOG_RADIUS + (EAGLE_EYE_BONUS[newLevel] ?? 0);
  }

  static getFogRadius(level: number): number {
    return DEFAULT_FOG_RADIUS + (EAGLE_EYE_BONUS[level] ?? 0);
  }
}
