import { BotAction } from '@bomberroyal/shared';
import { Bot, BotGameView, BotPersonalityHandler } from '../BotTypes.js';
import {
  findNearestPowerUp,
  findWeakestPlayer,
  findSafePath,
  moveToRandomSafe,
  getOtherPlayers,
  findNearestDestructible,
} from '../BotCore.js';
import {
  findPath,
  getDirectionToward,
  distance,
  getAdjacentDestructibles,
  countEscapeRoutes,
} from '../Pathfinding.js';

/**
 * BLITZ - The Speedster
 * Philosophy: "Gotta go fast." Aggressive hunter that grabs power-ups on the way.
 *
 * Behavior Priorities:
 * 1. Survive (flee from danger) - handled by BotManager
 * 2. Collect ANY nearby power-up (greedy!)
 * 3. Chase and bomb players
 * 4. Destroy blocks constantly
 * 5. Never stop moving
 */
export const BlitzPersonality: BotPersonalityHandler = {
  decide(bot: Bot, gameView: BotGameView, dangerTiles: Set<string>): BotAction {
    const botPos = bot.player.position;
    const player = bot.player;
    const currentBombCount = gameView.bombs.filter(b => b.ownerId === player.id).length;

    // Priority 1: ALWAYS collect ANY visible power-up (greedy collection!)
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

    // Priority 2: Aggressively hunt players
    const target = findWeakestPlayer(gameView, player.id);
    if (target) {
      const dist = distance(botPos, target.position);

      // If close, drop a bomb!
      if (dist <= 3 && currentBombCount < player.maxBombs) {
        const escapeCount = countEscapeRoutes(botPos, gameView);
        if (escapeCount >= 1) {
          bot.state = 'bombing';
          return { type: 'place_bomb' };
        }
      }

      // Chase the target
      bot.state = 'hunting';
      const path = findPath(botPos, target.position, gameView, dangerTiles);
      if (path.length > 1) {
        const dir = getDirectionToward(botPos, path[1]);
        if (dir) {
          return { type: 'move', direction: dir };
        }
      }
    }

    // Priority 3: Destroy blocks to create paths and reveal power-ups
    if (currentBombCount < player.maxBombs) {
      const adjacentBlocks = getAdjacentDestructibles(botPos, gameView);
      if (adjacentBlocks.length > 0) {
        const escapeCount = countEscapeRoutes(botPos, gameView);
        if (escapeCount >= 1) {
          bot.state = 'bombing';
          return { type: 'place_bomb' };
        }
      }
    }

    // Priority 4: Move toward nearest destructible block to bomb it
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

    // Default: Keep moving (random safe direction) - Blitz never stops
    bot.state = 'idle';
    return moveToRandomSafe(botPos, gameView, dangerTiles);
  },
};
