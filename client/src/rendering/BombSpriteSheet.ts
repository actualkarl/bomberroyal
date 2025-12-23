import { Assets, Texture, Rectangle } from 'pixi.js';

// Bomb sprite frame data from hadouken atlas
export interface BombSpriteFrames {
  idle: Texture[];      // Blue energy ball animation (normal state)
  warning: Texture[];   // Same frames with orange tint (warning state)
  critical: Texture[];  // Same frames with red tint (critical state)
}

// Animation speeds for bomb states (PixiJS animation speed)
export const BOMB_ANIMATIONS = {
  idle: { fps: 8 },      // Smooth animation for idle
  warning: { fps: 12 },  // Faster for warning
  critical: { fps: 16 }, // Rapid for critical
};

// Convert FPS to PixiJS animationSpeed (60fps base)
export function getBombAnimationSpeed(fps: number): number {
  return fps / 60;
}

// Path to assets - new 2x2 grid hadouken sprite sheet (512x512 frames)
const SPRITE_SHEET_PATH = '/assets/sf2/effects/hadouken.png';
const ATLAS_PATH = '/assets/sf2/effects/hadouken.json';

// Frame definitions from atlas (frame names)
// All 4 frames used for smooth animation - frames are all same size (512x512)
const FRAME_NAMES = [
  'hadouken_charge_0',
  'hadouken_charge_1',
  'hadouken_charge_2',
  'hadouken_charge_3',
];

/**
 * Load the bomb sprite sheet (hadouken effects) and return textures grouped by animation state
 */
export async function loadBombSpriteSheet(): Promise<BombSpriteFrames | null> {
  try {
    // Load the atlas JSON
    const atlasData = await fetch(ATLAS_PATH).then(r => r.json());

    // Load the base texture using Assets.load
    const baseTexture = await Assets.load(SPRITE_SHEET_PATH);

    // Extract frames from atlas
    const frames: Record<string, Texture> = {};

    for (const [frameName, frameData] of Object.entries(atlasData.frames)) {
      const data = frameData as {
        frame: { x: number; y: number; w: number; h: number };
      };

      const rect = new Rectangle(
        data.frame.x,
        data.frame.y,
        data.frame.w,
        data.frame.h
      );

      // PixiJS 8.x: Create texture from base texture with frame
      // Use the baseTexture directly (it's already a Texture in PixiJS 8)
      const frameTexture = new Texture({
        source: baseTexture.source,
        frame: rect,
      });

      frames[frameName] = frameTexture;
    }

    // Get all frames in order for animation
    const allFrames = FRAME_NAMES.map(name => frames[name]).filter(Boolean);

    // Verify we have all 4 frames
    if (allFrames.length !== 4) {
      console.warn('BombSpriteSheet: Expected 4 frames, got:', allFrames.length);
      console.warn('Available frames:', Object.keys(frames));
      return null;
    }

    // All states use the same frames - color tinting applied at render time
    const bombFrames: BombSpriteFrames = {
      idle: allFrames,
      warning: allFrames,
      critical: allFrames,
    };

    console.log('BombSpriteSheet: Loaded hadouken bomb sprites successfully (4 frames)');
    return bombFrames;

  } catch (error) {
    console.error('BombSpriteSheet: Failed to load hadouken sprites:', error);
    return null;
  }
}
