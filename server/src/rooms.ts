import {
  Room,
  Player,
  GameState,
  GameSettings,
  PlayerColor,
  RoomInfo,
} from '@bomberroyal/shared';
import {
  ROOM_CODE_LENGTH,
  DEFAULT_GRID_WIDTH,
  DEFAULT_GRID_HEIGHT,
  SHRINK_START_DELAY,
  SHRINK_INTERVAL,
  POWER_UP_DROP_CHANCE,
  DEFAULT_FOG_RADIUS,
  DEFAULT_MAX_BOMBS,
  DEFAULT_BLAST_RADIUS,
  DEFAULT_SPEED,
  PLAYER_COLORS,
  MAX_PLAYERS,
  BOMB_AUDIO_RANGE,
  BOMB_WARNING_TIME,
} from '@bomberroyal/shared';
import { initializePlayerAbilities } from './abilities/index.js';

// In-memory room storage
const rooms = new Map<string, Room>();

// Generate random room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate unique room code
function getUniqueRoomCode(): string {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }
  return code;
}

// Create default game settings
function createDefaultSettings(): GameSettings {
  return {
    gridSize: { width: DEFAULT_GRID_WIDTH, height: DEFAULT_GRID_HEIGHT },
    shrinkStartDelay: SHRINK_START_DELAY,
    shrinkInterval: SHRINK_INTERVAL,
    powerUpDropChance: POWER_UP_DROP_CHANCE,
    startingFogRadius: DEFAULT_FOG_RADIUS,
    bombAudioRange: BOMB_AUDIO_RANGE,
    bombWarningTime: BOMB_WARNING_TIME,
  };
}

// Create initial game state (lobby)
function createInitialGameState(settings: GameSettings): GameState {
  return {
    phase: 'LOBBY',
    grid: [],
    shrinkZone: {
      active: false,
      currentBounds: {
        minX: 0,
        maxX: settings.gridSize.width - 1,
        minY: 0,
        maxY: settings.gridSize.height - 1,
      },
      nextShrinkAt: 0,
      shrinkInterval: settings.shrinkInterval,
    },
    tick: 0,
    startedAt: null,
    countdown: 0,
    winner: null,
  };
}

// Get next available color for a room
function getNextAvailableColor(room: Room): PlayerColor {
  const usedColors = new Set(room.players.map((p) => p.color));
  for (const color of PLAYER_COLORS) {
    if (!usedColors.has(color)) {
      return color;
    }
  }
  return 'red'; // Fallback (shouldn't happen with 4 max players)
}

// Create a new player
function createPlayer(
  id: string,
  displayName: string,
  color: PlayerColor,
  isHost: boolean
): Player {
  return {
    id,
    displayName,
    position: { x: 0, y: 0 },
    alive: true,
    ready: isHost, // Host is always ready
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
    maxBombs: DEFAULT_MAX_BOMBS,
    blastRadius: DEFAULT_BLAST_RADIUS,
    speed: DEFAULT_SPEED,
    hasShield: false,
    canKickBombs: false,
    kickLevel: 0,
    canRemoteDetonate: false,
    remoteDetonateLevel: 0,
    fogRadius: DEFAULT_FOG_RADIUS,
  };
}

// Create a new room
export function createRoom(hostId: string, hostName: string): Room {
  const code = getUniqueRoomCode();
  const settings = createDefaultSettings();
  const hostPlayer = createPlayer(hostId, hostName, 'red', true);

  const room: Room = {
    id: crypto.randomUUID(),
    code,
    hostId,
    players: [hostPlayer],
    gameState: createInitialGameState(settings),
    settings,
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  return room;
}

// Get room by code
export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

// Get room info (for join screen)
export function getRoomInfo(code: string): RoomInfo | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;

  const host = room.players.find((p) => p.id === room.hostId);
  return {
    code: room.code,
    playerCount: room.players.length,
    phase: room.gameState.phase,
    hostName: host?.displayName || 'Unknown',
  };
}

// Add player to room
export function addPlayerToRoom(
  code: string,
  playerId: string,
  displayName: string
): { room: Room; player: Player } | { error: string } {
  const room = rooms.get(code.toUpperCase());

  if (!room) {
    return { error: 'Room not found' };
  }

  if (room.gameState.phase !== 'LOBBY') {
    return { error: 'Game already in progress' };
  }

  if (room.players.some((p) => p.id === playerId)) {
    return { error: 'Already in room' };
  }

  // Check if this is the room creator joining (temp host ID)
  if (room.hostId.startsWith('temp-') && room.players.length === 1) {
    const hostPlayer = room.players[0];
    // Verify display name matches to confirm it's the creator
    if (hostPlayer.displayName === displayName) {
      // Update the temp host ID to the real socket ID
      hostPlayer.id = playerId;
      room.hostId = playerId;
      return { room, player: hostPlayer };
    }
  }

  if (room.players.length >= MAX_PLAYERS) {
    return { error: 'Room is full' };
  }

  const color = getNextAvailableColor(room);
  const player = createPlayer(playerId, displayName, color, false);
  room.players.push(player);

  return { room, player };
}

// Remove player from room
export function removePlayerFromRoom(
  code: string,
  playerId: string
): { room: Room; newHostId: string | null } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;

  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return null;

  room.players.splice(playerIndex, 1);

  // If room is empty, delete it
  if (room.players.length === 0) {
    rooms.delete(code.toUpperCase());
    return null;
  }

  // If host left, assign new host
  let newHostId: string | null = null;
  if (room.hostId === playerId) {
    newHostId = room.players[0].id;
    room.hostId = newHostId;
    // New host is automatically ready
    room.players[0].ready = true;
  }

  return { room, newHostId };
}

// Update player ready status
export function setPlayerReady(
  code: string,
  playerId: string,
  ready: boolean
): Room | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;

  // Host is always ready
  if (playerId !== room.hostId) {
    player.ready = ready;
  }

  return room;
}

// Check if all players are ready (allow solo for testing)
export function allPlayersReady(room: Room): boolean {
  return room.players.length >= 1 && room.players.every((p) => p.ready);
}

// Get player's room code by socket ID
const playerRoomMap = new Map<string, string>();

export function setPlayerRoom(playerId: string, code: string): void {
  playerRoomMap.set(playerId, code);
}

export function getPlayerRoom(playerId: string): string | undefined {
  return playerRoomMap.get(playerId);
}

export function removePlayerRoom(playerId: string): void {
  playerRoomMap.delete(playerId);
}

// Delete room
export function deleteRoom(code: string): void {
  rooms.delete(code.toUpperCase());
}

// Get all rooms (for debugging)
export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

// Reset room for a new game (play again)
export function resetRoomForNewGame(room: Room): void {
  // Reset game state
  room.gameState = createInitialGameState(room.settings);

  // Reset all players
  for (const player of room.players) {
    player.position = { x: 0, y: 0 };
    player.alive = true;
    player.ready = player.id === room.hostId; // Host stays ready
    player.powerUps = [];
    player.abilities = initializePlayerAbilities();
    player.stats = {
      kills: 0,
      deaths: 0,
      bombsPlaced: 0,
      blocksDestroyed: 0,
      powerUpsCollected: 0,
    };
    player.bombCount = 0;
    player.maxBombs = DEFAULT_MAX_BOMBS;
    player.blastRadius = DEFAULT_BLAST_RADIUS;
    player.speed = DEFAULT_SPEED;
    player.hasShield = false;
    player.canKickBombs = false;
    player.kickLevel = 0;
    player.canRemoteDetonate = false;
    player.remoteDetonateLevel = 0;
    player.fogRadius = DEFAULT_FOG_RADIUS;
  }
}
