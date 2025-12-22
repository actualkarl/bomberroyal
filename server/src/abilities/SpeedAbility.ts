import { Player } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier } from './BaseAbility.js';
import { SPEED_MULTIPLIERS } from '@bomberroyal/shared';

export class SpeedAbility extends BaseAbility {
  id = 'speed' as const;
  name = 'Speed';
  description = 'Increase movement speed';

  tiers: AbilityTier[] = [
    { level: 0, effect: 'Base speed' },
    { level: 1, effect: '+15% speed' },
    { level: 2, effect: '+30% speed' },
    { level: 3, effect: '+45% speed', isUltimate: true },
  ];

  onUpgrade(player: Player, newLevel: number): void {
    player.speed = SPEED_MULTIPLIERS[newLevel] ?? 1.0;
  }

  // Get speed multiplier for level
  static getSpeedMultiplier(level: number): number {
    return SPEED_MULTIPLIERS[level] ?? 1.0;
  }

  // Get the speed level from player's abilities
  static getSpeedLevel(player: Player): number {
    const abilities = player.abilities;
    if (abilities instanceof Map) {
      return abilities.get('speed')?.level ?? 0;
    }
    return (abilities as Record<string, { level: number }>)['speed']?.level ?? 0;
  }
}
