import { Player } from '@bomberroyal/shared';
import { BaseAbility, AbilityTier } from './BaseAbility.js';
import { KICK_DISTANCES } from '@bomberroyal/shared';

export class BombKickAbility extends BaseAbility {
  id = 'bomb_kick' as const;
  name = 'Bomb Kick';
  description = 'Kick bombs by walking into them';

  tiers: AbilityTier[] = [
    { level: 0, effect: 'Cannot kick bombs' },
    { level: 1, effect: 'Kick bomb 1 tile' },
    { level: 2, effect: 'Kick bomb 2 tiles' },
    { level: 3, effect: 'Kick bomb until obstacle', downside: 'Press SPACEBAR to stop mid-slide', isUltimate: true },
  ];

  onUpgrade(player: Player, newLevel: number): void {
    player.canKickBombs = newLevel > 0;
    player.kickLevel = newLevel;
  }

  // Get the maximum kick distance for a level
  static getKickDistance(level: number): number {
    return KICK_DISTANCES[level] ?? 0;
  }

  // Check if kick at this level can be stopped
  static canStopKick(level: number): boolean {
    return level >= 3;
  }
}
