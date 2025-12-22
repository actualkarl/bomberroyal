import { Player, AbilityId, AbilityState } from '@bomberroyal/shared';
import { AbilityDefinition, initializePlayerAbilities, getAbilityLevel, setAbilityLevel } from './BaseAbility.js';
import { BombCountAbility } from './BombCountAbility.js';
import { BlastRadiusAbility } from './BlastRadiusAbility.js';
import { BombKickAbility } from './BombKickAbility.js';
import { RemoteDetonateAbility } from './RemoteDetonateAbility.js';
import { SpeedAbility } from './SpeedAbility.js';
import { ShieldAbility } from './ShieldAbility.js';
import { PiercingBombAbility } from './PiercingBombAbility.js';
import { EagleEyeAbility } from './EagleEyeAbility.js';
import { QuickFuseAbility } from './QuickFuseAbility.js';

// Singleton registry for all abilities
class AbilityRegistry {
  private abilities: Map<AbilityId, AbilityDefinition> = new Map();

  constructor() {
    // Register all abilities
    this.register(new BombCountAbility());
    this.register(new BlastRadiusAbility());
    this.register(new BombKickAbility());
    this.register(new RemoteDetonateAbility());
    this.register(new SpeedAbility());
    this.register(new ShieldAbility());
    this.register(new PiercingBombAbility());
    this.register(new EagleEyeAbility());
    this.register(new QuickFuseAbility());
  }

  private register(ability: AbilityDefinition): void {
    this.abilities.set(ability.id, ability);
  }

  get(id: AbilityId): AbilityDefinition | undefined {
    return this.abilities.get(id);
  }

  getAll(): AbilityDefinition[] {
    return Array.from(this.abilities.values());
  }

  getAllIds(): AbilityId[] {
    return Array.from(this.abilities.keys());
  }

  // Apply an ability upgrade to a player
  upgradeAbility(player: Player, abilityId: AbilityId): boolean {
    const ability = this.abilities.get(abilityId);
    if (!ability) return false;

    const currentLevel = getAbilityLevel(player, abilityId);
    if (currentLevel >= ability.maxLevel) return false;

    const newLevel = currentLevel + 1;
    setAbilityLevel(player, abilityId, newLevel);
    ability.onUpgrade(player, newLevel);

    return true;
  }

  // Remove an ability from a player (e.g., shield consumed)
  loseAbility(player: Player, abilityId: AbilityId): void {
    const ability = this.abilities.get(abilityId);
    if (!ability) return;

    setAbilityLevel(player, abilityId, 0);
    ability.onLose?.(player);
  }

  // Get random ability choices for power-up drop (roguelike style)
  getRandomChoices(player: Player, count: number = 3): AbilityId[] {
    const available = this.getAllIds().filter(id => {
      const ability = this.abilities.get(id);
      return ability?.canUpgrade(player);
    });

    // Shuffle and take the first `count` items
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

// Export singleton instance
export const abilityRegistry = new AbilityRegistry();

// Re-export helpers
export { initializePlayerAbilities, getAbilityLevel, setAbilityLevel };

// Helper to convert legacy power-up type to ability ID
export function legacyPowerUpToAbilityId(powerUpType: string): AbilityId | null {
  const mapping: Record<string, AbilityId> = {
    'extra_bomb': 'bomb_count',
    'bigger_blast': 'blast_radius',
    'bomb_kick': 'bomb_kick',
    'remote_detonate': 'remote_detonate',
    'speed_boost': 'speed',
    'shield': 'shield',
    'piercing_bomb': 'piercing_bomb',
    'eagle_eye': 'eagle_eye',
    'quick_fuse': 'quick_fuse',
  };
  return mapping[powerUpType] ?? null;
}
