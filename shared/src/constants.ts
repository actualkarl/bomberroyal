// Grid settings
export const DEFAULT_GRID_WIDTH = 15;
export const DEFAULT_GRID_HEIGHT = 13;

// Player settings
export const MAX_PLAYERS = 4;
export const DEFAULT_MAX_BOMBS = 1;
export const DEFAULT_BLAST_RADIUS = 2;
export const DEFAULT_SPEED = 1;
export const DEFAULT_FOG_RADIUS = 5;

// Bomb settings
export const DEFAULT_FUSE_TIME = 3000; // ms
export const EXPLOSION_DURATION = 500; // ms
export const BOMB_AUDIO_RANGE = 3; // tiles - ticking sound audible within this range
export const BOMB_WARNING_TIME = 1000; // ms - bomb visible through fog in last second
export const BOMB_PLACEMENT_AUDIO_RANGE = 5; // tiles - placement sound audible within this range
export const EXPLOSION_AUDIO_RANGE = 8; // tiles - explosion sound audible within this range

// Power-up settings
export const POWER_UP_DROP_CHANCE = 0.3;
export const POWER_UP_CHOICES_COUNT = 3;

// Shrink zone settings
export const SHRINK_START_DELAY = 60000; // ms
export const SHRINK_INTERVAL = 10000; // ms
export const SHRINK_AMOUNT = 1; // cells per shrink

// Game loop
export const TICK_RATE = 20; // ticks per second
export const TICK_INTERVAL = 1000 / TICK_RATE;

// Room settings
export const ROOM_CODE_LENGTH = 6;
export const ROOM_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Player colors in order
export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow'] as const;

// Ability system constants
export const ABILITY_MAX_LEVELS = {
  bomb_count: 3,      // Level 0: 1 bomb, Level 1: 2, Level 2: 3, Level 3: 4
  blast_radius: 3,    // Level 0: 1 tile, Level 1: 2, Level 2: 3, Level 3: 4
  bomb_kick: 3,       // Level 0: can't kick, Level 1: 1 tile, Level 2: 2 tiles, Level 3: until obstacle
  remote_detonate: 3, // Level 0: can't, Level 1: own bombs, Level 2: increased range, Level 3: any bomb in LOS
  speed: 3,           // Level 0: base, Level 1: +15%, Level 2: +30%, Level 3: +45%
  shield: 1,          // Level 0: no shield, Level 1: has shield (consumed on hit)
  piercing_bomb: 1,   // Level 0: normal, Level 1: pierces blocks
  eagle_eye: 2,       // Level 0: normal fog, Level 1: +3 radius, Level 2: +6 radius
  quick_fuse: 3,      // Level 0: 3s, Level 1: 2.5s, Level 2: 2s, Level 3: 1.5s
} as const;

// Speed ability values per level
export const SPEED_MULTIPLIERS = [1.0, 1.15, 1.30, 1.45] as const;  // Level 0-3

// Kick ability values
export const KICK_DISTANCES = [0, 1, 2, Infinity] as const;  // Level 0-3 (Infinity = until obstacle)
export const BOMB_SLIDE_SPEED = 5;  // Tiles per second

// Fuse time per quick_fuse level (ms)
export const FUSE_TIMES = [3000, 2500, 2000, 1500] as const;  // Level 0-3

// Eagle eye fog radius bonus per level
export const EAGLE_EYE_BONUS = [0, 3, 6] as const;  // Level 0-2
