import { BotAction } from '@bomberroyal/shared';
import { Bot, BotGameView, BotPersonalityHandler, Position } from '../BotTypes.js';
import {
  findNearestPowerUp,
  findNearestDestructible,
  findNearestPlayer,
  findSafePath,
  moveToRandomSafe,
} from '../BotCore.js';
import {
  findPath,
  getDirectionToward,
  distance,
  getAdjacentDestructibles,
  countEscapeRoutes,
} from '../Pathfinding.js';

/**
 * DEMOMAN - The Mad Bomber
 * Philosophy: "More explosions = more fun." Destroys everything, grabs power-ups.
 *
 * Behavior Priorities:
 * 1. Survive (flee from danger) - handled by BotManager
 * 2. Collect ANY power-up (especially bomb-related)
 * 3. Bomb everything - blocks and players alike
 * 4. Never stop bombing
 */
export const DemomanPersonality: BotPersonalityHandler = {
  decide(bot: Bot, gameView: BotGameView, dangerTiles: Set<string>): BotAction {
    const botPos = bot.player.position;
    const player = bot.player;
    const currentBombCount = gameView.bombs.filter(b => b.ownerId === player.id).length;

    // Priority 1: Collect ANY power-up (greedy!)
    const anyPowerUp = findNearestPowerUp(botPos, gameView);
    if (anyPowerUp) {
      bot.state = 'collecting';
      const path = findPath(botPos, anyPowerUp, gameView, dangerTiles);
      if (path.length > 1) {
        const dir = getDirectionToward(botPos, path[1]);
        if (dir) {
          return { type: 'move', direction: dir };
        }
      }
    }

    // Priority 2: Place bomb if near anything - blocks OR players
    if (currentBombCount < player.maxBombs) {
      const adjacentDestructibles = getAdjacentDestructibles(botPos, gameView);
      const nearbyPlayer = findNearestPlayer(gameView, player.id);
      const playerClose = nearbyPlayer && distance(botPos, nearbyPlayer.position) <= 3;

      if (adjacentDestructibles.length > 0 || playerClose) {
        const escapeCount = countEscapeRoutes(botPos, gameView);
        if (escapeCount >= 1) {
          bot.state = 'bombing';
          return { type: 'place_bomb' };
        }
      }
    }

    // Priority 3: Hunt players aggressively
    const nearbyPlayer = findNearestPlayer(gameView, player.id);
    if (nearbyPlayer) {
      const dist = distance(botPos, nearbyPlayer.position);

      // Move toward player
      if (dist > 2) {
        bot.state = 'hunting';
        const path = findPath(botPos, nearbyPlayer.position, gameView, dangerTiles);
        if (path.length > 1) {
          const dir = getDirectionToward(botPos, path[1]);
          if (dir) {
            return { type: 'move', direction: dir };
          }
        }
      }
    }

    // Priority 4: Find destructible blocks to bomb
    const targetBlock = findNearestDestructible(botPos, gameView);
    if (targetBlock) {
      bot.state = 'bombing';
      const adjacentPositions = [
        { x: targetBlock.x + 1, y: targetBlock.y },
        { x: targetBlock.x - 1, y: targetBlock.y },
        { x: targetBlock.x, y: targetBlock.y + 1 },
        { x: targetBlock.x, y: targetBlock.y - 1 },
      ].filter(pos => {
        const cell = gameView.grid[pos.y]?.[pos.x];
        return cell === 'empty' && !dangerTiles.has(`${pos.x},${pos.y}`);
      });

      if (adjacentPositions.length > 0) {
        let closest = adjacentPositions[0];
        let closestDist = distance(botPos, closest);
        for (const pos of adjacentPositions) {
          const dist = distance(botPos, pos);
          if (dist < closestDist) {
            closestDist = dist;
            closest = pos;
          }
        }

        const path = findPath(botPos, closest, gameView, dangerTiles);
        if (path.length > 1) {
          const dir = getDirectionToward(botPos, path[1]);
          if (dir) {
            return { type: 'move', direction: dir };
          }
        }
      }
    }

    // Default: Wander randomly
    bot.state = 'idle';
    return moveToRandomSafe(botPos, gameView, dangerTiles);
  },
};
