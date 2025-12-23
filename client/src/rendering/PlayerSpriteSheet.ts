import { Texture, Rectangle, ImageSource, SCALE_MODES } from 'pixi.js';

// Ryu sprite sheet configuration
// 1024x1024 image, 4 columns x 3 rows grid
const SHEET_WIDTH = 1024;
const SHEET_HEIGHT = 1024;
const COLS = 4;
const ROWS = 3;
const CELL_WIDTH = SHEET_WIDTH / COLS;  // 256
const CELL_HEIGHT = SHEET_HEIGHT / ROWS; // ~341

// Animation definitions (frame indices 0-11)
export const PLAYER_ANIMATIONS = {
  idle: { frames: [0, 1, 2, 3], fps: 6 },
  walk: { frames: [4, 5, 6, 7], fps: 8 },
  action: { frames: [8, 9, 10, 11], fps: 10 },
} as const;

// Baseline offsets for jitter correction (per-frame vertical adjustment)
export const BASELINE_OFFSETS: Record<number, number> = {
  0: 0, 1: 1, 2: 0, 3: 1,
  4: 0, 5: 0, 6: 1, 7: 0,
  8: 0, 9: 1, 10: 0, 11: 0,
};

export interface PlayerSpriteFrames {
  idle: Texture[];
  walk: Texture[];
  action: Texture[];
}

// Load player sprite sheet and slice into frame textures
export async function loadPlayerSpriteSheet(): Promise<PlayerSpriteFrames> {
  const sheetPath = '/assets/sf2/characters/ryu/ryu_sheet_1024.png';

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Create base texture with nearest neighbor scaling for pixel-perfect rendering
        const source = new ImageSource({
          resource: img,
          scaleMode: SCALE_MODES.NEAREST,
        });

        // Extract all 12 frames from the grid
        const allFrames: Texture[] = [];

        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            const frameRect = new Rectangle(
              col * CELL_WIDTH,
              row * CELL_HEIGHT,
              CELL_WIDTH,
              CELL_HEIGHT
            );

            const frameTexture = new Texture({
              source: source,
              frame: frameRect,
            });

            allFrames.push(frameTexture);
          }
        }

        // Group frames by animation
        const frames: PlayerSpriteFrames = {
          idle: PLAYER_ANIMATIONS.idle.frames.map(i => allFrames[i]),
          walk: PLAYER_ANIMATIONS.walk.frames.map(i => allFrames[i]),
          action: PLAYER_ANIMATIONS.action.frames.map(i => allFrames[i]),
        };

        console.log('Player sprite sheet loaded successfully');
        resolve(frames);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load player sprite sheet: ${sheetPath}`));
    };

    img.src = sheetPath;
  });
}

// Get animation speed from FPS
export function getAnimationSpeed(fps: number): number {
  // PixiJS animationSpeed is frames per tick (60fps base)
  return fps / 60;
}

// Get baseline offset for a specific frame index
export function getBaselineOffset(frameIndex: number): number {
  return BASELINE_OFFSETS[frameIndex] || 0;
}
