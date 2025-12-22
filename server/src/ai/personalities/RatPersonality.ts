import { BotAction, Player } from '@bomberroyal/shared';
import { Bot, BotGameView, BotPersonalityHandler, Position } from '../BotTypes.js';
import {
  findNearestPowerUp,
  findWeakestPlayer,
  findFurthestPointFromPlayers,
  getOtherPlayers,
  isDistracted,
  findNearestDestructible,
  moveToRandomSafe,
} from '../BotCore.js';
import {
  findPath,
  getDirectionToward,
  distance,
  canSafelyPlaceBomb,
  getAdjacentDestructibles,
  getAdjacentWalkable,
} from '../Pathfinding.js';

/**
 * RAT - The Opportunist
 * Philosophy: "Collect everything, avoid confrontation, strike when safe."
 * More active than before - actively hunts power-ups while avoiding players.
 *
 * Behavior Priorities:
 * 1. Survive (flee from danger) - handled by BotManager
 * 2. Collect ANY nearby power-up (high priority!)
 * 3. Destroy blocks to find more power-ups
 * 4. Avoid players who are too close
 * 5. Opportunistic attacks on distracted/weak targets
 */
export const RatPersonality: BotPersonalityHandler = {
  decide(bot: Bot, gameView: BotGameView, dangerTiles: Set<string>): BotAction {
    const botPos = bot.player.position;
    const player = bot.player;
    const allPlayers = getOtherPlayers(gameView, player.id);
    const currentBombCount = gameView.bombs.filter(b => b.ownerId === player.id).length;

    // Find nearest player for threat assessment
    const nearestPlayer = allPlayers.reduce<Player | null>((nearest, p) => {
      if (!nearest) return p;
      return distance(botPos, p.position) < distance(botPos, nearest.position) ? p : nearest;
    }, null);

    const nearestPlayerDist = nearestPlayer ? distance(botPos, nearestPlayer.position) : Infinity;

    // Priority 1: If player is VERY close (< 3), drop defensive bomb and flee
    if (nearestPlayer && nearestPlayerDist < 3) {
      if (currentBombCount < player.maxBombs) {
        if (canSafelyPlaceBomb(botPos, player.blastRadius, gameView, dangerTiles)) {
          bot.state = 'bombing';
          return { type: 'place_bomb' };
        }
      }
      // Try to flee
      const fleeTarget = findFurthestPointFromPlayers(gameView, allPlayers);
      if (fleeTarget) {
        const path = findPath(botPos, fleeTarget, gameView, dangerTiles);
        if (path.length > 1) {
          const dir = getDirectionToward(botPos, path[1]);
          if (dir) {
            bot.state = 'fleeing';
            return { type: 'move', direction: dir };
          }
        }
      }
    }

    // Priority 2: AGGRESSIVELY collect power-ups (main goal!)
    const nearestPowerUp = findNearestPowerUp(botPos, gameView);
    if (nearestPowerUp) {
      const powerUpDist = distance(botPos, nearestPowerUp);
      // Go for power-ups even if players are moderately close
      // Only avoid if player is closer to the power-up than we are
      let playerCloser = false;
      for (const p of allPlayers) {
        if (distance(p.position, nearestPowerUp) < powerUpDist - 1) {
          playerCloser = true;
          break;
        }
      }

      if (!playerCloser) {
        bot.state = 'collecting';
        const path = findPath(botPos, nearestPowerUp, gameView, dangerTiles);
        if (path.length > 1) {
          const dir = getDirectionToward(botPos, path[1]);
          if (dir) {
            return { type: 'move', direction: dir };
          }
        }
      }
    }

    // Priority 3: Destroy blocks to reveal power-ups
    if (currentBombCount < player.maxBombs) {
      const adjacentBlocks = getAdjacentDestructibles(botPos, gameView);
      if (adjacentBlocks.length > 0) {
        if (canSafelyPlaceBomb(botPos, player.blastRadius, gameView, dangerTiles)) {
          bot.state = 'bombing';
          return { type: 'place_bomb' };
        }
      }
    }

    // Priority 4: Move toward destructible blocks to bomb them
    const nearestBlock = findNearestDestructible(botPos, gameView);
    if (nearestBlock) {
      const directions = [
        { x: nearestBlock.x + 1, y: nearestBlock.y },
        { x: nearestBlock.x - 1, y: nearestBlock.y },
        { x: nearestBlock.x, y: nearestBlock.y + 1 },
        { x: nearestBlock.x, y: nearestBlock.y - 1 },
      ];

      for (const targetPos of directions) {
        const cell = gameView.grid[targetPos.y]?.[targetPos.x];
        if (cell === 'empty' && !dangerTiles.has(`${targetPos.x},${targetPos.y}`)) {
          const path = findPath(botPos, targetPos, gameView, dangerTiles);
          if (path.length > 1) {
            const dir = getDirectionToward(botPos, path[1]);
            if (dir) {
              bot.state = 'bombing';
              return { type: 'move', direction: dir };
            }
          }
        }
      }
    }

    // Priority 5: Opportunistic attack on weak/distracted targets
    const weakTarget = findWeakestPlayer(gameView, player.id);
    if (weakTarget && isDistracted(weakTarget, gameView)) {
      const dist = distance(botPos, weakTarget.position);
      if (dist <= 3 && currentBombCount < player.maxBombs) {
        if (canSafelyPlaceBomb(botPos, player.blastRadius, gameView, dangerTiles)) {
          bot.state = 'hunting';
          return { type: 'place_bomb' };
        }
      }
      // Move toward weak target
      if (dist > 2 && dist < 6) {
        const path = findPath(botPos, weakTarget.position, gameView, dangerTiles);
        if (path.length > 1) {
          const dir = getDirectionToward(botPos, path[1]);
          if (dir) {
            bot.state = 'hunting';
            return { type: 'move', direction: dir };
          }
        }
      }
    }

    // Priority 6: Wander randomly to explore
    bot.state = 'idle';
    return moveToRandomSafe(botPos, gameView, dangerTiles);
  },
};
