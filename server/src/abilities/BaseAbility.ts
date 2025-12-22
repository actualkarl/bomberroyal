import { Player, AbilityId, AbilityState } from '@bomberroyal/shared';
import { ABILITY_MAX_LEVELS } from '@bomberroyal/shared';

export interface AbilityTier {
  level: number;
  effect: string;
  downside?: string;
  isUltimate?: boolean;
}

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  description: string;
  maxLevel: number;
  tiers: AbilityTier[];

  // Called when ability is upgraded (level increases)
  onUpgrade(player: Player, newLevel: number): void;

  // Called when ability is lost (e.g., shield consumed)
  onLose?(player: Player): void;

  // Get description for a specific level
  getDescription(level: number): string;

  // Check if ability can be upgraded
  canUpgrade(player: Player): boolean;
}

// Base implementation with common logic
export abstract class BaseAbility implements AbilityDefinition {
  abstract id: AbilityId;
  abstract name: string;
  abstract description: string;
  abstract tiers: AbilityTier[];

  get maxLevel(): number {
    return ABILITY_MAX_LEVELS[this.id] ?? 1;
  }

  abstract onUpgrade(player: Player, newLevel: number): void;

  onLose?(player: Player): void;

  getDescription(level: number): string {
    const tier = this.tiers.find(t => t.level === level);
    if (!tier) return this.description;
    return tier.effect + (tier.downside ? ` (${tier.downside})` : '');
  }

  canUpgrade(player: Player): boolean {
    const abilities = player.abilities as Record<AbilityId, AbilityState>;
    const current = abilities[this.id];
    if (!current) return true;
    return current.level < this.maxLevel;
  }

  getCurrentLevel(player: Player): number {
    const abilities = player.abilities as Record<AbilityId, AbilityState>;
    return abilities[this.id]?.level ?? 0;
  }
}

// Helper to initialize a player's abilities
export function initializePlayerAbilities(): Record<AbilityId, AbilityState> {
  const abilities: Record<AbilityId, AbilityState> = {} as Record<AbilityId, AbilityState>;

  const abilityIds: AbilityId[] = [
    'bomb_count',
    'blast_radius',
    'bomb_kick',
    'remote_detonate',
    'speed',
    'shield',
    'piercing_bomb',
    'eagle_eye',
    'quick_fuse',
  ];

  for (const id of abilityIds) {
    abilities[id] = {
      id,
      level: 0,
      maxLevel: ABILITY_MAX_LEVELS[id] ?? 1,
    };
  }

  return abilities;
}

// Helper to get ability level from player
export function getAbilityLevel(player: Player, abilityId: AbilityId): number {
  const abilities = player.abilities as Record<AbilityId, AbilityState>;
  return abilities[abilityId]?.level ?? 0;
}

// Helper to set ability level
export function setAbilityLevel(player: Player, abilityId: AbilityId, level: number): void {
  const abilities = player.abilities as Record<AbilityId, AbilityState>;
  if (abilities[abilityId]) {
    abilities[abilityId].level = Math.min(level, ABILITY_MAX_LEVELS[abilityId] ?? 1);
  }
}
