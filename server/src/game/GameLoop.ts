import { Server } from 'socket.io';
import {
  Room,
  Player,
  Bomb,
  Explosion,
  PowerUpDrop,
  VisibleGameState,
  ClientToServerEvents,
  ServerToClientEvents,
  Cell,
} from '@bomberroyal/shared';
import { TICK_INTERVAL } from '@bomberroyal/shared';
import { generateGrid, isWalkable, SPAWN_POSITIONS } from './Grid.js';
import {
  getVisibleCells,
  getVisiblePlayers,
  getVisibleBombs,
  getVisiblePowerUps,
  getVisibleExplosions,
  hasLineOfSight,
} from './FogOfWar.js';
import {
  placeBomb,
  processExplodingBombs,
  calculateExplosionCells,
  createExplosion,
  processExplosionDestruction,
  processExpiredExplosions,
  returnBombToPlayer,
  processSlidingBombs,
  tryKickBomb,
  stopPlayerKickedBombs,
} from './Bomb.js';
import { BombKickAbility } from '../abilities/BombKickAbility.js';
import { createPowerUpDrop, checkPowerUpCollection, applyPowerUp } from './PowerUp.js';
import { processShrinkZone } from './ShrinkZone.js';
import { POWER_UP_DROP_CHANCE } from '@bomberroyal/shared';
import {
  processBots,
  createBotGameView,
  isBot,
  syncBotPlayers,
  chooseBotPowerUp,
} from '../ai/BotManager.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Track pending power-up choices per player
const pendingPowerUpChoices = new Map<string, { powerUpId: string; playerId: string }>();

// Explored cell memory per player (stores last seen cell type)
type ExploredCellsMap = Map<string, Map<string, Cell>>;  // playerId -> "x,y" -> Cell type

interface GameLoopState {
  bombs: Map<string, Bomb>;
  explosions: Map<string, Explosion>;
  powerUpDrops: Map<string, PowerUpDrop>;
  exploredCells: ExploredCellsMap;  // Track what each player has explored
  intervalId: NodeJS.Timeout | null;
  lastTickTime: number;
}

// Active game loops by room code
const gameLoops = new Map<string, GameLoopState>();

export function startGameLoop(room: Room, io: TypedServer): void {
  // Generate the grid
  room.gameState.grid = generateGrid(
    room.settings.gridSize.width,
    room.settings.gridSize.height
  );

  // Assign spawn positions to players
  room.players.forEach((player, index) => {
    const spawn = SPAWN_POSITIONS[index];
    player.position = { x: spawn.x, y: spawn.y };
    player.alive = true;
  });

  // Initialize game loop state
  const loopState: GameLoopState = {
    bombs: new Map(),
    explosions: new Map(),
    powerUpDrops: new Map(),
    exploredCells: new Map(),
    intervalId: null,
    lastTickTime: Date.now(),
  };

  // Initialize explored cells map for each player
  for (const player of room.players) {
    loopState.exploredCells.set(player.id, new Map());
  }

  gameLoops.set(room.code, loopState);

  // Start the tick loop
  loopState.intervalId = setInterval(() => {
    tick(room, loopState, io);
  }, TICK_INTERVAL);

  // Send initial state to all players
  broadcastGameState(room, loopState, io);
}

export function stopGameLoop(roomCode: string): void {
  const loopState = gameLoops.get(roomCode);
  if (loopState?.intervalId) {
    clearInterval(loopState.intervalId);
    gameLoops.delete(roomCode);
  }
}

function tick(room: Room, loopState: GameLoopState, io: TypedServer): void {
  try {
    if (room.gameState.phase !== 'PLAYING') {
      return;
    }

    // Safety check: ensure grid exists
    if (!room.gameState.grid || room.gameState.grid.length === 0) {
      console.error('Game tick error: Grid is not initialized');
      return;
    }

    room.gameState.tick++;
  const currentTime = Date.now();
  const deltaTime = currentTime - loopState.lastTickTime;
  loopState.lastTickTime = currentTime;

  // Process sliding bombs (kick mechanic)
  processSlidingBombs(loopState.bombs, room.gameState.grid, deltaTime, room.players);

  // Process bombs (check for explosions)
  const explodingBombs = processExplodingBombs(loopState.bombs, currentTime);

  // Process all bombs that need to explode (including chain reactions)
  const processedBombs = new Set<string>();
  const bombsToProcess = [...explodingBombs];

  while (bombsToProcess.length > 0) {
    const bomb = bombsToProcess.shift()!;
    if (processedBombs.has(bomb.id)) continue;
    processedBombs.add(bomb.id);

    // Calculate explosion cells
    const explosionCells = calculateExplosionCells(
      bomb,
      room.gameState.grid,
      loopState.bombs
    );

    // Create explosion
    const explosion = createExplosion(bomb, explosionCells);
    loopState.explosions.set(explosion.id, explosion);

    // Process destruction
    const { destroyedBlocks, killedPlayers, chainedBombs } =
      processExplosionDestruction(
        explosion,
        room.gameState.grid,
        room.players,
        loopState.bombs
      );

    // Update kill stats
    for (const killedId of killedPlayers) {
      const killer = room.players.find((p) => p.id === bomb.ownerId);
      if (killer && killer.id !== killedId) {
        killer.stats.kills++;
      }
      // Emit player death event
      io.to(room.code).emit('player-died', {
        playerId: killedId,
        killerId: bomb.ownerId !== killedId ? bomb.ownerId : null,
      });
    }

    // Update blocks destroyed stat and spawn power-ups
    const owner = room.players.find((p) => p.id === bomb.ownerId);
    if (owner) {
      owner.stats.blocksDestroyed += destroyedBlocks.length;
    }

    // Spawn power-ups from destroyed blocks
    for (const block of destroyedBlocks) {
      if (Math.random() < POWER_UP_DROP_CHANCE) {
        const powerUp = createPowerUpDrop(block.x, block.y);
        loopState.powerUpDrops.set(powerUp.id, powerUp);
      }
    }

    // Return bomb to player
    returnBombToPlayer(bomb, room.players);

    // Remove exploded bomb
    loopState.bombs.delete(bomb.id);

    // Queue chained bombs for processing
    for (const chainedBomb of chainedBombs) {
      if (!processedBombs.has(chainedBomb.id)) {
        bombsToProcess.push(chainedBomb);
      }
    }
  }

  // Process expired explosions
  processExpiredExplosions(loopState.explosions, currentTime);

  // Process shrink zone
  const shrinkResult = processShrinkZone(room, currentTime);
  for (const killedId of shrinkResult.killedPlayers) {
    io.to(room.code).emit('player-died', {
      playerId: killedId,
      killerId: null, // Killed by zone
    });
  }

  // Process bot AI decisions
  const botGameView = createBotGameView(room, loopState.bombs, loopState.explosions, loopState.powerUpDrops);
  const botActions = processBots(room.code, botGameView);

  // Debug: Log if bots returned no actions occasionally
  if (botActions.size === 0 && room.gameState.tick % 100 === 0) {
    const aliveBots = room.players.filter(p => p.id.startsWith('bot-') && p.alive);
    if (aliveBots.length > 0) {
      console.log(`Tick ${room.gameState.tick}: ${aliveBots.length} alive bots but no actions returned`);
    }
  }

  // Execute bot actions
  for (const [botId, action] of botActions) {
    const botPlayer = room.players.find(p => p.id === botId);
    if (!botPlayer || !botPlayer.alive) continue;

    switch (action.type) {
      case 'move':
        if (action.direction) {
          handlePlayerMove(room, botId, action.direction);
        }
        break;
      case 'place_bomb':
        handlePlaceBomb(room, botId);
        break;
      case 'remote_detonate':
        handleRemoteDetonate(room, botId);
        break;
    }
  }

  // Sync bot player references after actions
  syncBotPlayers(room.code, room.players);

  // Process power-up collection
  for (const player of room.players) {
    if (!player.alive) continue;

    // Check if player already has a pending power-up choice
    const hasPending = Array.from(pendingPowerUpChoices.values()).some(
      (p) => p.playerId === player.id
    );
    if (hasPending) continue;  // Skip if player already has a pending choice

    const powerUp = checkPowerUpCollection(player, loopState.powerUpDrops);
    if (powerUp) {
      // Remove from map
      loopState.powerUpDrops.delete(powerUp.id);

      // Only send choice if there are valid options
      if (powerUp.choices.length > 0) {
        // Bots automatically choose a power-up based on personality preference
        if (isBot(player.id)) {
          // Bot chooses based on personality preference
          const choice = chooseBotPowerUp(player.id, powerUp.choices);
          applyPowerUp(player, choice);
          // Note: applyPowerUp already increments powerUpsCollected
        } else {
          // Human players get the choice UI
          pendingPowerUpChoices.set(powerUp.id, { powerUpId: powerUp.id, playerId: player.id });

          io.to(player.id).emit('powerup-choice', {
            powerUpId: powerUp.id,
            choices: powerUp.choices,
          });
        }
      }
      // If no choices available, just consume the power-up without showing modal
    }
  }

  // Check for game over (1 or 0 players alive)
  const alivePlayers = room.players.filter((p) => p.alive);
  // Game over if: 1 player left in multiplayer, OR 0 players left (including single player)
  if (alivePlayers.length === 0 || (alivePlayers.length === 1 && room.players.length > 1)) {
    room.gameState.phase = 'GAME_OVER';
    room.gameState.winner = alivePlayers[0]?.id || null;
    stopGameLoop(room.code);

    io.to(room.code).emit('game-over', {
      winnerId: room.gameState.winner,
      stats: Object.fromEntries(room.players.map((p) => [p.id, p.stats])),
    });
    return;
  }

  // Broadcast state to all players
  broadcastGameState(room, loopState, io);
  } catch (error) {
    console.error('Game tick error:', error);
    // Don't crash the server, just log the error
  }
}

function broadcastGameState(
  room: Room,
  loopState: GameLoopState,
  io: TypedServer
): void {
  const currentTime = Date.now();
  const bombs = Array.from(loopState.bombs.values());
  const explosions = Array.from(loopState.explosions.values());
  const powerUps = Array.from(loopState.powerUpDrops.values());

  // Send personalized state to each player (fog of war with line-of-sight)
  const grid = room.gameState.grid;

  for (const player of room.players) {
    if (!player.alive) continue;

    // Get currently visible cells
    const visibleCells = getVisibleCells(player, grid);

    // Get or create player's explored cells map
    let playerExplored = loopState.exploredCells.get(player.id);
    if (!playerExplored) {
      playerExplored = new Map();
      loopState.exploredCells.set(player.id, playerExplored);
    }

    // Create set of currently visible cell keys for quick lookup
    const visibleKeys = new Set(visibleCells.map(c => `${c.x},${c.y}`));

    // Update explored cells with current visible state
    for (const cell of visibleCells) {
      playerExplored.set(`${cell.x},${cell.y}`, cell.type);
    }

    // Build explored cells array (cells that were seen before but aren't visible now)
    const exploredCells: { x: number; y: number; type: Cell }[] = [];
    for (const [key, cellType] of playerExplored) {
      if (!visibleKeys.has(key)) {
        const [x, y] = key.split(',').map(Number);
        exploredCells.push({ x, y, type: cellType });
      }
    }

    const visibleState: VisibleGameState = {
      phase: room.gameState.phase,
      shrinkZone: room.gameState.shrinkZone,
      tick: room.gameState.tick,
      visibleCells,
      exploredCells,
      visiblePlayers: getVisiblePlayers(player, room.players, grid),
      visibleBombs: getVisibleBombs(player, bombs, currentTime, grid),
      visibleExplosions: getVisibleExplosions(explosions, player),
      visiblePowerUps: getVisiblePowerUps(player, powerUps, grid),
      self: player,
      myBombs: getVisibleBombs(
        player,
        bombs.filter((b) => b.ownerId === player.id),
        currentTime,
        grid
      ),
      audioEvents: [], // Audio events for directional sound
    };

    io.to(player.id).emit('game-state', { state: visibleState });
  }
}

export function handlePlayerMove(
  room: Room,
  playerId: string,
  direction: 'up' | 'down' | 'left' | 'right'
): boolean {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return false;

  const { x, y } = player.position;
  let newX = x;
  let newY = y;

  switch (direction) {
    case 'up':
      newY = y - 1;
      break;
    case 'down':
      newY = y + 1;
      break;
    case 'left':
      newX = x - 1;
      break;
    case 'right':
      newX = x + 1;
      break;
  }

  // Check if new position is walkable
  if (isWalkable(room.gameState.grid, newX, newY)) {
    // Check for bomb collision
    const loopState = gameLoops.get(room.code);
    if (loopState) {
      const bombAtPosition = Array.from(loopState.bombs.values()).find(
        (b) => b.position.x === newX && b.position.y === newY
      );
      if (bombAtPosition) {
        // Try to kick the bomb if player has kick ability
        if (player.canKickBombs && player.kickLevel > 0) {
          const kicked = tryKickBomb(
            player,
            newX,
            newY,
            direction,
            loopState.bombs,
            room.gameState.grid,
            room.players
          );
          if (kicked) {
            // Player kicked the bomb, move into its position
            player.position = { x: newX, y: newY };
            return true;
          }
        }
        return false; // Can't walk through bombs and couldn't kick
      }
    }

    player.position = { x: newX, y: newY };
    return true;
  }

  return false;
}

export function getGameLoopState(roomCode: string): GameLoopState | undefined {
  return gameLoops.get(roomCode);
}

export function handlePlaceBomb(room: Room, playerId: string): boolean {
  const loopState = gameLoops.get(room.code);
  if (!loopState) return false;

  const player = room.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return false;

  const bomb = placeBomb(player, loopState.bombs);
  return bomb !== null;
}

export function handlePowerUpChoice(
  room: Room,
  playerId: string,
  powerUpId: string,
  choice: import('@bomberroyal/shared').PowerUpType
): boolean {
  const pending = pendingPowerUpChoices.get(powerUpId);
  if (!pending || pending.playerId !== playerId) {
    return false; // Invalid or not this player's choice
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player || !player.alive) {
    pendingPowerUpChoices.delete(powerUpId);
    return false;
  }

  // Apply the chosen power-up
  applyPowerUp(player, choice);
  pendingPowerUpChoices.delete(powerUpId);

  return true;
}

// Handle spacebar stop action (for kick level 3 bomb stop)
export function handleStopAction(room: Room, playerId: string): boolean {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return false;

  const loopState = gameLoops.get(room.code);
  if (!loopState) return false;

  let actionTaken = false;

  // Stop kicked bombs if player has kick level 3
  if (player.kickLevel >= 3 && BombKickAbility.canStopKick(player.kickLevel)) {
    const stoppedCount = stopPlayerKickedBombs(loopState.bombs, playerId);
    if (stoppedCount > 0) {
      actionTaken = true;
    }
  }

  return actionTaken;
}

// Handle remote detonate (E or Q key)
export function handleRemoteDetonate(room: Room, playerId: string): string[] {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return [];

  // Check if player has remote detonate ability
  if (!player.canRemoteDetonate || player.remoteDetonateLevel <= 0) {
    return [];
  }

  const loopState = gameLoops.get(room.code);
  if (!loopState) return [];

  const detonatedBombIds: string[] = [];
  const grid = room.gameState.grid;

  for (const [bombId, bomb] of loopState.bombs) {
    let canDetonate = false;

    if (player.remoteDetonateLevel === 1) {
      // Level 1: Can only detonate own bombs
      canDetonate = bomb.ownerId === player.id;
    } else if (player.remoteDetonateLevel === 2) {
      // Level 2: Can detonate own bombs from further away
      canDetonate = bomb.ownerId === player.id;
    } else if (player.remoteDetonateLevel >= 3) {
      // Level 3: Can detonate ANY bomb in line of sight
      if (bomb.ownerId === player.id) {
        canDetonate = true;
      } else {
        // Check line of sight for other player's bombs
        canDetonate = hasLineOfSight(
          player.position.x,
          player.position.y,
          bomb.position.x,
          bomb.position.y,
          grid
        );
      }
    }

    if (canDetonate) {
      // Force the bomb to explode immediately by setting placedAt in the past
      bomb.placedAt = Date.now() - bomb.fuseTime - 1;
      detonatedBombIds.push(bombId);
    }
  }

  return detonatedBombIds;
}
