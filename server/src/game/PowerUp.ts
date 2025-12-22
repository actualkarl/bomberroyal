import { Player, AbilityId, PowerUpDrop } from '@bomberroyal/shared';
import { POWER_UP_CHOICES_COUNT } from '@bomberroyal/shared';
import { abilityRegistry, getAbilityLevel } from '../abilities/index.js';

// Generate unique power-up ID
function generatePowerUpId(): string {
  return `pu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create a power-up drop at a position
export function createPowerUpDrop(
  x: number,
  y: number,
  player?: Player
): PowerUpDrop {
  // Get upgradeable abilities for the player (if provided), otherwise use all
  const choices = player
    ? abilityRegistry.getRandomChoices(player, POWER_UP_CHOICES_COUNT)
    : abilityRegistry.getRandomChoices({ abilities: {} } as Player, POWER_UP_CHOICES_COUNT);

  return {
    id: generatePowerUpId(),
    position: { x, y },
    choices,
  };
}

// Check if player is on a power-up
export function checkPowerUpCollection(
  player: Player,
  powerUps: Map<string, PowerUpDrop>
): PowerUpDrop | null {
  for (const [_id, powerUp] of powerUps) {
    if (
      powerUp.position.x === player.position.x &&
      powerUp.position.y === player.position.y
    ) {
      return powerUp;
    }
  }
  return null;
}

// Apply a power-up (ability upgrade) to a player
export function applyPowerUp(
  player: Player,
  abilityId: AbilityId
): boolean {
  const success = abilityRegistry.upgradeAbility(player, abilityId);
  if (success) {
    player.stats.powerUpsCollected++;

    // Also track in legacy powerUps array for backwards compatibility
    const existing = player.powerUps.find((p) => p.type === abilityId);
    if (existing) {
      existing.stacks++;
    } else {
      player.powerUps.push({ type: abilityId, stacks: 1 });
    }
  }
  return success;
}

// Get power-up description for UI
export function getPowerUpDescription(abilityId: AbilityId, player?: Player): string {
  const ability = abilityRegistry.get(abilityId);
  if (!ability) return 'Unknown power-up';

  const currentLevel = player ? getAbilityLevel(player, abilityId) : 0;
  const nextLevel = currentLevel + 1;

  return ability.getDescription(nextLevel);
}
