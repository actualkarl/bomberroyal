import { Player, Room, BotPersonality, BotAction, Bomb, Explosion, PowerUpDrop, AbilityId } from '@bomberroyal/shared';
import { Bot, BotGameView, BotPersonalityHandler } from './BotTypes.js';
import { calculateDangerTiles, isDangerous } from './BotCore.js';
import { findNearestSafeTile, getDirectionToward, findPath } from './Pathfinding.js';
import { BlitzPersonality } from './personalities/BlitzPersonality.js';
import { DemomanPersonality } from './personalities/DemomanPersonality.js';
import { RatPersonality } from './personalities/RatPersonality.js';
import { initializePlayerAbilities } from '../abilities/index.js';

// Bot decision throttle (ms) - faster = more reactive bots
const BOT_DECISION_INTERVAL = 100;

// Personality handlers
const personalityHandlers: Record<BotPersonality, BotPersonalityHandler> = {
  blitz: BlitzPersonality,
  demoman: DemomanPersonality,
  rat: RatPersonality,
};

// Active bots per room
const roomBots = new Map<string, Bot[]>();

// Create a bot player
export function createBotPlayer(
  botId: string,
  personality: BotPersonality,
  color: 'red' | 'blue' | 'green' | 'yellow'
): Player {
  const displayNames: Record<BotPersonality, string> = {
    blitz: 'Bot Blitz',
    demoman: 'Bot Demoman',
    rat: 'Bot Rat',
  };

  return {
    id: botId,
    displayName: displayNames[personality],
    position: { x: 0, y: 0 },
    alive: true,
    ready: true,  // Bots are always ready
    color,
    powerUps: [],
    abilities: initializePlayerAbilities(),
    stats: {
      kills: 0,
      deaths: 0,
      bombsPlaced: 0,
      blocksDestroyed: 0,
      powerUpsCollected: 0,
    },
    bombCount: 0,
    maxBombs: 1,
    blastRadius: 2,
    speed: 1,
    hasShield: false,
    canKickBombs: false,
    kickLevel: 0,
    canRemoteDetonate: false,
    remoteDetonateLevel: 0,
    fogRadius: 5,
  };
}

// Create a bot
export function createBot(personality: BotPersonality, player: Player): Bot {
  return {
    id: player.id,
    personality,
    player,
    state: 'idle',
    targetPosition: null,
    lastDecisionTime: 0,
  };
}

// Add bots to a room
export function addBotsToRoom(room: Room, botCount: number): void {
  const personalities: BotPersonality[] = ['blitz', 'demoman', 'rat'];
  const availableColors: Array<'red' | 'blue' | 'green' | 'yellow'> = ['red', 'blue', 'green', 'yellow'];

  // Remove colors already used by existing players (including existing bots)
  const usedColors = new Set(room.players.map(p => p.color));
  const freeColors = availableColors.filter(c => !usedColors.has(c));

  // Get existing bots or create empty array
  const existingBots = roomBots.get(room.code) || [];
  const existingBotCount = existingBots.length;

  for (let i = 0; i < botCount && freeColors.length > 0; i++) {
    // Use existingBotCount + i to get different personalities for subsequent bots
    const personalityIndex = (existingBotCount + i) % personalities.length;
    const personality = personalities[personalityIndex];
    const color = freeColors.shift()!;
    const botId = `bot-${existingBotCount + i}-${Date.now()}`;

    const botPlayer = createBotPlayer(botId, personality, color);
    const bot = createBot(personality, botPlayer);

    // Add player to room
    room.players.push(botPlayer);
    existingBots.push(bot);
  }

  roomBots.set(room.code, existingBots);
}

// Remove bots from a room
export function removeBotsFromRoom(roomCode: string): void {
  roomBots.delete(roomCode);
}

// Get bots for a room
export function getBotsForRoom(roomCode: string): Bot[] {
  return roomBots.get(roomCode) || [];
}

// Check if a player is a bot
export function isBot(playerId: string): boolean {
  return playerId.startsWith('bot-');
}

// Create game view for bots (they see everything)
export function createBotGameView(
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
    powerUps: Array.from(powerUps.values()),
    shrinkBounds: room.gameState.shrinkZone.currentBounds,
  };
}

// Process bot decisions and return actions
export function processBots(
  roomCode: string,
  gameView: BotGameView
): Map<string, BotAction> {
  const bots = roomBots.get(roomCode) || [];
  const actions = new Map<string, BotAction>();
  const now = Date.now();

  for (const bot of bots) {
    // Sync bot's player reference with room state FIRST
    const roomPlayer = gameView.players.find(p => p.id === bot.id);
    if (roomPlayer) {
      bot.player = roomPlayer;
    } else {
      // Bot not found in room, skip
      continue;
    }

    // Skip dead bots
    if (!bot.player.alive) continue;

    // Throttle decisions
    if (now - bot.lastDecisionTime < BOT_DECISION_INTERVAL) continue;
    bot.lastDecisionTime = now;

    try {
      // Calculate danger
      const dangerTiles = calculateDangerTiles(gameView);
      const botPos = bot.player.position;

      // SURVIVAL FIRST (all personalities)
      if (isDangerous(botPos, dangerTiles)) {
        bot.state = 'fleeing';
        const safeTile = findNearestSafeTile(botPos, dangerTiles, gameView);
        if (safeTile) {
          const path = findPath(botPos, safeTile, gameView, dangerTiles);
          if (path.length > 1) {
            const dir = getDirectionToward(botPos, path[1]);
            if (dir) {
              actions.set(bot.id, { type: 'move', direction: dir });
              continue;
            }
          }
        }
        // Even if we can't find a safe tile, try to move anyway
        const handler = personalityHandlers[bot.personality];
        const action = handler.decide(bot, gameView, dangerTiles);
        actions.set(bot.id, action);
        continue;
      }

      // PERSONALITY BEHAVIOR
      const handler = personalityHandlers[bot.personality];
      const action = handler.decide(bot, gameView, dangerTiles);
      actions.set(bot.id, action);
    } catch (error) {
      console.error(`Bot ${bot.id} decision error:`, error);
      // On error, just try to move randomly
      actions.set(bot.id, { type: 'none' });
    }
  }

  return actions;
}

// Update bot player reference after game state changes
export function syncBotPlayers(roomCode: string, players: Player[]): void {
  const bots = roomBots.get(roomCode);
  if (!bots) return;

  for (const bot of bots) {
    const player = players.find(p => p.id === bot.id);
    if (player) {
      bot.player = player;
    }
  }
}

// Reset bots for new game
export function resetBotsForNewGame(roomCode: string): void {
  const bots = roomBots.get(roomCode);
  if (!bots) return;

  for (const bot of bots) {
    bot.state = 'idle';
    bot.targetPosition = null;
    bot.lastDecisionTime = 0;
  }
}

// Choose a power-up for a bot based on personality preference
export function chooseBotPowerUp(botId: string, choices: AbilityId[]): AbilityId {
  // Find the bot to get its personality
  for (const [, bots] of roomBots) {
    const bot = bots.find(b => b.id === botId);
    if (bot) {
      return choosePowerUpForPersonality(bot.personality, choices);
    }
  }

  // Default: choose first option
  return choices[0];
}

// Choose power-up based on personality preferences
function choosePowerUpForPersonality(personality: BotPersonality, choices: AbilityId[]): AbilityId {
  // Priority lists for each personality
  const priorities: Record<BotPersonality, AbilityId[]> = {
    blitz: ['speed', 'bomb_kick', 'shield', 'bomb_count', 'blast_radius'],
    demoman: ['bomb_count', 'blast_radius', 'piercing_bomb', 'quick_fuse', 'remote_detonate'],
    rat: ['shield', 'eagle_eye', 'speed', 'remote_detonate', 'bomb_kick'],
  };

  const priorityList = priorities[personality];

  // Find the highest priority choice available
  for (const preferred of priorityList) {
    if (choices.includes(preferred)) {
      return preferred;
    }
  }

  // Default: choose first option
  return choices[0];
}
