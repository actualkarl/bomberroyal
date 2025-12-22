// === PLAYER ===
export interface Player {
  id: string;
  displayName: string;
  position: { x: number; y: number };
  alive: boolean;
  ready: boolean;
  color: PlayerColor;
  powerUps: ActivePowerUp[];
  abilities: Map<AbilityId, AbilityState> | Record<AbilityId, AbilityState>;
  stats: PlayerStats;
  // Bomb properties (derived from abilities)
  bombCount: number;
  maxBombs: number;
  blastRadius: number;
  speed: number;
  // Special abilities (derived from ability levels)
  hasShield: boolean;
  canKickBombs: boolean;
  kickLevel: number;  // 0 = can't kick, 1-3 = kick tiers
  canRemoteDetonate: boolean;
  remoteDetonateLevel: number;  // 0 = can't detonate, 1-3 = detonate tiers
  fogRadius: number;
}

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export interface PlayerStats {
  kills: number;
  deaths: number;
  bombsPlaced: number;
  blocksDestroyed: number;
  powerUpsCollected: number;
}

// === BOMBS & EXPLOSIONS ===
export type BombVisibility = 'hidden' | 'audio_range' | 'warning' | 'exploding';

export interface Bomb {
  id: string;
  ownerId: string;
  position: { x: number; y: number };
  blastRadius: number;
  placedAt: number;
  fuseTime: number;
  isPiercing: boolean;
  // Sliding state (for kick mechanic)
  isSliding: boolean;
  slideDirection: 'up' | 'down' | 'left' | 'right' | null;
  slideProgress: number;  // 0-1 progress to next tile
  kickedBy: string | null;  // Player who kicked it
}

// What the client receives (visibility calculated per-player)
export interface VisibleBomb extends Bomb {
  visibility: BombVisibility;
  distanceToPlayer: number;  // for audio volume calculation
  direction: number;         // angle in radians for stereo panning
  timeRemaining: number;     // ms until explosion
}

export interface Explosion {
  id: string;
  cells: { x: number; y: number }[];
  ownerId: string;
  startedAt: number;
  duration: number;
}

// === AUDIO EVENTS ===
export type AudioEventType =
  | 'bomb_placed'
  | 'bomb_tick'
  | 'bomb_warning'
  | 'explosion'
  | 'player_death'
  | 'powerup_collect';

export interface AudioEvent {
  type: AudioEventType;
  position: { x: number; y: number };
  intensity: number;      // 0-1, for volume
  direction: number;      // angle in radians for stereo panning
}

// === ABILITIES (Tiered Power-Up System) ===
export type AbilityId =
  | 'bomb_count'
  | 'blast_radius'
  | 'bomb_kick'
  | 'remote_detonate'
  | 'speed'
  | 'shield'
  | 'piercing_bomb'
  | 'eagle_eye'
  | 'quick_fuse';

// Legacy type for backwards compatibility
export type PowerUpType = AbilityId;

export interface AbilityState {
  id: AbilityId;
  level: number;  // 0 = not collected, 1-3 = ability tiers
  maxLevel: number;
}

export interface PowerUpDrop {
  id: string;
  position: { x: number; y: number };
  choices: AbilityId[];
}

// Legacy interface for backwards compatibility
export interface ActivePowerUp {
  type: PowerUpType;
  stacks: number;
}

// Sliding bomb state for kick mechanic
export interface SlidingBomb {
  bombId: string;
  direction: 'up' | 'down' | 'left' | 'right';
  targetX: number;
  targetY: number;
  kickLevel: number;  // 1 = 1 tile, 2 = 2 tiles, 3 = until obstacle
  tilesRemaining: number;  // For level 1-2, how many tiles left to slide
  canBeStopped: boolean;  // Level 3 allows spacebar stop
}

// === GAME STATE ===
export type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'GAME_OVER';
export type Cell = 'empty' | 'destructible' | 'indestructible' | 'shrink_death';

export interface ShrinkZone {
  active: boolean;
  currentBounds: { minX: number; maxX: number; minY: number; maxY: number };
  nextShrinkAt: number;
  shrinkInterval: number;
}

export interface GameState {
  phase: GamePhase;
  grid: Cell[][];
  shrinkZone: ShrinkZone;
  tick: number;
  startedAt: number | null;
  countdown: number;
  winner: string | null;
}

export interface GameSettings {
  gridSize: { width: number; height: number };
  shrinkStartDelay: number;
  shrinkInterval: number;
  powerUpDropChance: number;
  startingFogRadius: number;
  bombAudioRange: number;      // tiles for ticking sound (default: 3)
  bombWarningTime: number;     // ms before explosion to show bomb (default: 1000)
}

// === ROOM ===
export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  gameState: GameState;
  settings: GameSettings;
  createdAt: number;
}

// Simplified room info for join screen
export interface RoomInfo {
  code: string;
  playerCount: number;
  phase: GamePhase;
  hostName: string;
}

// === SOCKET EVENTS ===

// Client -> Server
export interface ClientToServerEvents {
  'join-room': (data: { code: string; displayName: string }) => void;
  'leave-room': () => void;
  'player-ready': (data: { ready: boolean }) => void;
  'start-game': () => void;
  'player-move': (data: { direction: 'up' | 'down' | 'left' | 'right' }) => void;
  'place-bomb': () => void;
  'stop-action': () => void;  // Spacebar stop for kick level 3 or speed brake
  'remote-detonate': () => void;
  'choose-powerup': (data: { powerUpId: string; choice: PowerUpType }) => void;
  'play-again': () => void;
  'add-bots': (data: { count: number }) => void;  // Add AI bots to the room
  'remove-bots': () => void;  // Remove all AI bots from the room
}

// Server -> Client
export interface ServerToClientEvents {
  'room-joined': (data: { room: Room; playerId: string }) => void;
  'room-state': (data: { room: Room }) => void;
  'player-joined': (data: { player: Player }) => void;
  'player-left': (data: { playerId: string }) => void;
  'player-ready-changed': (data: { playerId: string; ready: boolean }) => void;
  'game-countdown': (data: { seconds: number }) => void;
  'game-started': () => void;
  'game-state': (data: { state: VisibleGameState }) => void;
  'audio-events': (data: { events: AudioEvent[] }) => void;
  'powerup-choice': (data: { powerUpId: string; choices: PowerUpType[] }) => void;
  'player-died': (data: { playerId: string; killerId: string | null }) => void;
  'game-over': (data: { winnerId: string | null; stats: Record<string, PlayerStats> }) => void;
  'error': (data: { message: string }) => void;
}

// === BOT TYPES ===
export type BotPersonality = 'blitz' | 'demoman' | 'rat';

export type BotState =
  | 'idle'
  | 'fleeing'       // Running from danger
  | 'hunting'       // Chasing a player
  | 'bombing'       // Destroying blocks
  | 'collecting'    // Getting power-ups
  | 'hiding';       // Staying safe

export interface BotAction {
  type: 'move' | 'place_bomb' | 'remote_detonate' | 'none';
  direction?: 'up' | 'down' | 'left' | 'right';
}

// Fog-filtered game state sent to each player
export interface VisibleGameState {
  phase: GamePhase;
  shrinkZone: ShrinkZone;
  tick: number;
  visibleCells: { x: number; y: number; type: Cell }[];
  exploredCells: { x: number; y: number; type: Cell }[];  // Previously seen but not currently visible (dimmed)
  visiblePlayers: Player[];
  visibleBombs: VisibleBomb[];
  visibleExplosions: Explosion[];  // ALL explosions visible
  visiblePowerUps: PowerUpDrop[];
  self: Player;
  myBombs: VisibleBomb[];
  audioEvents: AudioEvent[];
}
