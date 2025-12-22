/**
 * Bot Stress Test Script
 *
 * Runs multiple bot-only games to test game stability and collect statistics.
 * Usage: npx tsx scripts/stress-test.ts [numGames]
 */

import { Room, Player, Cell, Bomb, Explosion, PowerUpDrop, BotAction } from '@bomberroyal/shared';
import { TICK_INTERVAL, POWER_UP_DROP_CHANCE } from '@bomberroyal/shared';
import { generateGrid, SPAWN_POSITIONS } from '../src/game/Grid.js';
import { processShrinkZone } from '../src/game/ShrinkZone.js';
import {
  placeBomb,
  processExplodingBombs,
  calculateExplosionCells,
  createExplosion,
  processExplosionDestruction,
  processExpiredExplosions,
  returnBombToPlayer,
  processSlidingBombs,
} from '../src/game/Bomb.js';
import { createPowerUpDrop, applyPowerUp } from '../src/game/PowerUp.js';
import { calculateDangerTiles, isDangerous, findNearestPowerUp, findNearestDestructible } from '../src/ai/BotCore.js';
import { findPath, getDirectionToward, findNearestSafeTile, countEscapeRoutes, getAdjacentDestructibles, isWalkable } from '../src/ai/Pathfinding.js';
import { BotGameView, Position, Bot } from '../src/ai/BotTypes.js';
import * as fs from 'fs';

interface GameStats {
  gameNumber: number;
  duration: number; // ms
  winner: string | null;
  winnerId: string | null;
  personality: string | null;
  totalTicks: number;
  bombsPlaced: number;
  blocksDestroyed: number;
  error: string | null;
}

interface StressTestResults {
  totalGames: number;
  completedGames: number;
  failedGames: number;
  averageDuration: number;
  winsByPersonality: Record<string, number>;
  draws: number;
  errors: string[];
  games: GameStats[];
}

// Bot personalities to use
const BOT_PERSONALITIES = ['blitz', 'demoman', 'rat'] as const;
type BotPersonality = (typeof BOT_PERSONALITIES)[number];

// Create a bot player
function createBotPlayer(
  index: number,
  personality: BotPersonality
): Player {
  const colors = ['red', 'blue', 'green', 'yellow'] as const;
  const spawn = SPAWN_POSITIONS[index];

  return {
    id: `bot-${index}-${personality}`,
    displayName: `Bot ${personality.charAt(0).toUpperCase() + personality.slice(1)}`,
    color: colors[index],
    position: { x: spawn.x, y: spawn.y },
    alive: true,
    ready: true,
    bombCount: 0,
    maxBombs: 1,
    blastRadius: 2,
    speed: 1,
    powerUps: [],
    abilities: {},
    canKickBombs: false,
    kickLevel: 0,
    canRemoteDetonate: false,
    remoteDetonateLevel: 0,
    hasShield: false,
    fogRadius: 5,
    stats: {
      kills: 0,
      deaths: 0,
      bombsPlaced: 0,
      blocksDestroyed: 0,
      powerUpsCollected: 0,
    },
  };
}

// Create a bot wrapper
function createBot(player: Player, personality: BotPersonality): Bot {
  return {
    id: player.id,
    personality,
    player,
    state: 'idle',
    targetPosition: null,
    lastDecisionTime: 0,
  };
}

// Create a test room
function createTestRoom(): { room: Room; bots: Bot[] } {
  const grid = generateGrid(15, 13);

  const players = [
    createBotPlayer(0, 'blitz'),
    createBotPlayer(1, 'demoman'),
    createBotPlayer(2, 'rat'),
    createBotPlayer(3, 'blitz'), // Second blitz
  ];

  const bots = [
    createBot(players[0], 'blitz'),
    createBot(players[1], 'demoman'),
    createBot(players[2], 'rat'),
    createBot(players[3], 'blitz'),
  ];

  const room: Room = {
    code: `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    hostId: players[0].id,
    players,
    gameState: {
      phase: 'PLAYING',
      tick: 0,
      grid,
      bombs: [],
      explosions: [],
      powerUps: [],
      startedAt: Date.now(),
      shrinkZone: {
        active: false,
        currentBounds: {
          minX: 0,
          maxX: 14,
          minY: 0,
          maxY: 12,
        },
        shrinkInterval: 10000,
        nextShrinkAt: 0,
      },
    },
    settings: {
      gridSize: { width: 15, height: 13 },
      maxPlayers: 4,
      shrinkStartDelay: 30000,
    },
    createdAt: Date.now(),
  } as Room;

  return { room, bots };
}

// Create game view for bots
function createGameView(
  room: Room,
  bombs: Map<string, Bomb>,
  explosions: Map<string, Explosion>,
  powerUps: Map<string, PowerUpDrop>
): BotGameView {
  return {
    grid: room.gameState.grid,
    gridWidth: room.settings.gridSize.width,
    gridHeight: room.settings.gridSize.height,
    players: room.players,
    bombs: Array.from(bombs.values()),
    explosions: Array.from(explosions.values()),
    powerUps: Array.from(powerUps.values()).map(p => ({
      id: p.id,
      position: p.position,
      choices: p.choices.map(c => c.type),
    })),
    shrinkBounds: room.gameState.shrinkZone.currentBounds,
  };
}

// Simple bot AI for stress testing
function botDecide(bot: Bot, gameView: BotGameView): BotAction {
  const dangerTiles = calculateDangerTiles(gameView);
  const botPos = bot.player.position;
  const currentBombCount = gameView.bombs.filter(b => b.ownerId === bot.player.id).length;

  // Priority 1: Flee from danger
  if (isDangerous(botPos, dangerTiles)) {
    const safeTile = findNearestSafeTile(botPos, dangerTiles, gameView);
    if (safeTile) {
      const path = findPath(botPos, safeTile, gameView, dangerTiles);
      if (path.length > 1) {
        const dir = getDirectionToward(botPos, path[1]);
        if (dir) return { type: 'move', direction: dir };
      }
    }
    // No safe tile found, try random direction
    const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
    const shuffled = directions.sort(() => Math.random() - 0.5);
    for (const dir of shuffled) {
      const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      const newPos = { x: botPos.x + dx, y: botPos.y + dy };
      if (isWalkable(newPos.x, newPos.y, gameView)) {
        return { type: 'move', direction: dir };
      }
    }
    return { type: 'none' };
  }

  // Priority 2: Collect power-ups
  const powerUp = findNearestPowerUp(botPos, gameView);
  if (powerUp) {
    const path = findPath(botPos, powerUp, gameView, dangerTiles);
    if (path.length > 1) {
      const dir = getDirectionToward(botPos, path[1]);
      if (dir) return { type: 'move', direction: dir };
    }
  }

  // Priority 3: Place bomb near destructible blocks
  if (currentBombCount < bot.player.maxBombs) {
    const adjacentBlocks = getAdjacentDestructibles(botPos, gameView);
    if (adjacentBlocks.length > 0) {
      const escapeCount = countEscapeRoutes(botPos, gameView);
      if (escapeCount >= 1) {
        return { type: 'place_bomb' };
      }
    }
  }

  // Priority 4: Move toward nearest destructible block
  const nearestBlock = findNearestDestructible(botPos, gameView);
  if (nearestBlock) {
    // Find an adjacent position to the block
    const directions = [
      { x: nearestBlock.x + 1, y: nearestBlock.y },
      { x: nearestBlock.x - 1, y: nearestBlock.y },
      { x: nearestBlock.x, y: nearestBlock.y + 1 },
      { x: nearestBlock.x, y: nearestBlock.y - 1 },
    ];

    for (const targetPos of directions) {
      if (isWalkable(targetPos.x, targetPos.y, gameView) &&
          !dangerTiles.has(`${targetPos.x},${targetPos.y}`)) {
        const path = findPath(botPos, targetPos, gameView, dangerTiles);
        if (path.length > 1) {
          const dir = getDirectionToward(botPos, path[1]);
          if (dir) return { type: 'move', direction: dir };
        }
      }
    }
  }

  // Default: Random movement
  const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
  const shuffled = directions.sort(() => Math.random() - 0.5);
  for (const dir of shuffled) {
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const newPos = { x: botPos.x + dx, y: botPos.y + dy };
    if (isWalkable(newPos.x, newPos.y, gameView) &&
        !dangerTiles.has(`${newPos.x},${newPos.y}`)) {
      return { type: 'move', direction: dir };
    }
  }

  return { type: 'none' };
}

// Game loop state
interface GameLoopState {
  bombs: Map<string, Bomb>;
  explosions: Map<string, Explosion>;
  powerUpDrops: Map<string, PowerUpDrop>;
  bots: Bot[];
}

// Simulate a single tick
function simulateTick(room: Room, state: GameLoopState, currentTime: number): void {
  const { bombs, explosions, powerUpDrops, bots } = state;
  const { grid } = room.gameState;
  const deltaTime = TICK_INTERVAL;

  // Process sliding bombs
  processSlidingBombs(bombs, grid, deltaTime, room.players);

  // Process exploding bombs
  const explodingBombs = processExplodingBombs(bombs, currentTime);

  for (const bomb of explodingBombs) {
    const explosionCells = calculateExplosionCells(bomb, grid, bombs);
    const explosion = createExplosion(bomb, explosionCells);
    explosions.set(explosion.id, explosion);

    const destruction = processExplosionDestruction(explosion, grid, room.players, bombs);

    // Track destroyed blocks
    for (const block of destruction.destroyedBlocks) {
      // Find the player who placed the bomb and increment their stats
      const owner = room.players.find(p => p.id === bomb.ownerId);
      if (owner) {
        owner.stats.blocksDestroyed++;
      }

      // Chance to spawn power-up
      if (Math.random() < POWER_UP_DROP_CHANCE) {
        const powerUp = createPowerUpDrop(block.x, block.y);
        powerUpDrops.set(powerUp.id, powerUp);
      }
    }

    // Chain reactions
    for (const chainedBomb of destruction.chainedBombs) {
      if (chainedBomb.id !== bomb.id) {
        chainedBomb.placedAt = currentTime - chainedBomb.fuseTime - 1;
      }
    }

    // Return bomb to player
    returnBombToPlayer(bomb, room.players);
    bombs.delete(bomb.id);
  }

  // Process expired explosions
  processExpiredExplosions(explosions, currentTime);

  // Process shrink zone
  processShrinkZone(room, currentTime);

  // Create game view
  const gameView = createGameView(room, bombs, explosions, powerUpDrops);

  // Process bot decisions
  for (const bot of bots) {
    // Sync bot's player reference with room state
    const roomPlayer = room.players.find(p => p.id === bot.id);
    if (roomPlayer) {
      bot.player = roomPlayer;
    }

    if (!bot.player.alive) continue;

    // Make decision
    const action = botDecide(bot, gameView);

    if (action.type === 'move' && action.direction) {
      const dx = action.direction === 'left' ? -1 : action.direction === 'right' ? 1 : 0;
      const dy = action.direction === 'up' ? -1 : action.direction === 'down' ? 1 : 0;

      const newX = bot.player.position.x + dx;
      const newY = bot.player.position.y + dy;

      // Check collision
      if (newY >= 0 && newY < grid.length && newX >= 0 && newX < grid[0].length) {
        const cell = grid[newY][newX];
        if (cell === 'empty') {
          // Check for bombs at new position
          const bombAtPos = Array.from(bombs.values()).find(
            (b) => b.position.x === newX && b.position.y === newY
          );
          if (!bombAtPos) {
            bot.player.position = { x: newX, y: newY };
          }
        }
      }
    } else if (action.type === 'place_bomb') {
      const bomb = placeBomb(bot.player, bombs);
      if (bomb) {
        bot.player.stats.bombsPlaced++;
      }
    }

    // Check power-up collection
    for (const [id, powerUp] of powerUpDrops) {
      if (powerUp.position.x === bot.player.position.x &&
          powerUp.position.y === bot.player.position.y) {
        const choices = powerUp.choices || [];
        if (choices.length > 0) {
          const chosenAbility = choices[Math.floor(Math.random() * choices.length)];
          applyPowerUp(bot.player, chosenAbility.type);
          bot.player.stats.powerUpsCollected++;
          powerUpDrops.delete(id);
        }
      }
    }
  }

  room.gameState.tick++;
}

// Run a single game
function runGame(gameNumber: number): GameStats {
  const startTime = Date.now();
  const { room, bots } = createTestRoom();
  const state: GameLoopState = {
    bombs: new Map(),
    explosions: new Map(),
    powerUpDrops: new Map(),
    bots,
  };

  const MAX_TICKS = 6000; // 5 minutes at 20 ticks/sec
  let currentTime = Date.now();
  let totalBombs = 0;
  let totalBlocks = 0;

  try {
    for (let tick = 0; tick < MAX_TICKS; tick++) {
      simulateTick(room, state, currentTime);

      // Track stats
      totalBombs = room.players.reduce((sum, p) => sum + p.stats.bombsPlaced, 0);
      totalBlocks = room.players.reduce((sum, p) => sum + p.stats.blocksDestroyed, 0);

      // Check for game over
      const alivePlayers = room.players.filter((p) => p.alive);
      if (alivePlayers.length <= 1) {
        const duration = Date.now() - startTime;
        const winner = alivePlayers[0] || null;
        const personality = winner
          ? winner.id.split('-')[2] as BotPersonality
          : null;

        return {
          gameNumber,
          duration,
          winner: winner?.displayName || null,
          winnerId: winner?.id || null,
          personality,
          totalTicks: tick + 1,
          bombsPlaced: totalBombs,
          blocksDestroyed: totalBlocks,
          error: null,
        };
      }

      currentTime += TICK_INTERVAL;
    }

    // Game timed out
    return {
      gameNumber,
      duration: Date.now() - startTime,
      winner: null,
      winnerId: null,
      personality: null,
      totalTicks: MAX_TICKS,
      bombsPlaced: totalBombs,
      blocksDestroyed: totalBlocks,
      error: 'Game timeout - exceeded max ticks',
    };
  } catch (err) {
    return {
      gameNumber,
      duration: Date.now() - startTime,
      winner: null,
      winnerId: null,
      personality: null,
      totalTicks: room.gameState.tick,
      bombsPlaced: totalBombs,
      blocksDestroyed: totalBlocks,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Main stress test function
async function runStressTest(numGames: number): Promise<StressTestResults> {
  console.log(`Starting stress test: ${numGames} games\n`);

  const results: StressTestResults = {
    totalGames: numGames,
    completedGames: 0,
    failedGames: 0,
    averageDuration: 0,
    winsByPersonality: {
      blitz: 0,
      demoman: 0,
      rat: 0,
    },
    draws: 0,
    errors: [],
    games: [],
  };

  let totalDuration = 0;

  for (let i = 0; i < numGames; i++) {
    const gameStats = runGame(i + 1);
    results.games.push(gameStats);

    if (gameStats.error) {
      results.failedGames++;
      results.errors.push(`Game ${i + 1}: ${gameStats.error}`);
    } else if (gameStats.winner) {
      results.completedGames++;
      if (gameStats.personality) {
        results.winsByPersonality[gameStats.personality]++;
      }
    } else {
      results.draws++;
    }

    totalDuration += gameStats.duration;

    // Progress update every 10 games
    if ((i + 1) % 10 === 0 || i === numGames - 1) {
      console.log(
        `Progress: ${i + 1}/${numGames} games (${results.completedGames} completed, ${results.failedGames} failed, ${results.draws} draws)`
      );
    }
  }

  results.averageDuration = totalDuration / numGames;

  return results;
}

// Print results
function printResults(results: StressTestResults): void {
  console.log('\n========== STRESS TEST RESULTS ==========\n');
  console.log(`Total Games: ${results.totalGames}`);
  console.log(`Completed Games: ${results.completedGames}`);
  console.log(`Failed Games: ${results.failedGames}`);
  console.log(`Draws: ${results.draws}`);
  console.log(`Average Duration: ${(results.averageDuration / 1000).toFixed(2)}s`);

  console.log('\nWins by Personality:');
  for (const [personality, wins] of Object.entries(results.winsByPersonality)) {
    const percentage = results.completedGames > 0
      ? ((wins / results.completedGames) * 100).toFixed(1)
      : '0.0';
    console.log(`  ${personality}: ${wins} (${percentage}%)`);
  }

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of results.errors.slice(0, 10)) {
      console.log(`  - ${error}`);
    }
    if (results.errors.length > 10) {
      console.log(`  ... and ${results.errors.length - 10} more`);
    }
  }

  console.log('\n==========================================');
}

// Main execution
const numGames = parseInt(process.argv[2] || '50', 10);

runStressTest(numGames).then((results) => {
  printResults(results);

  // Save results to file
  const outputPath = 'test-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
});
