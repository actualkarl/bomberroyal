import { Assets, Texture, Rectangle } from 'pixi.js';

// Bomb sprite frame data from hadouken atlas
export interface BombSpriteFrames {
  idle: Texture[];      // fx_0, fx_1, fx_2 - Blue energy (normal state)
  warning: Texture[];   // fx_3, fx_4, fx_5 - Yellow/orange fiery (warning state)
  critical: Texture[];  // fx_6, fx_7, fx_8 - Blue with fiery accents (critical state)
}

// Animation speeds for bomb states (PixiJS animation speed)
export const BOMB_ANIMATIONS = {
  idle: { fps: 4 },      // Slow pulse for idle
  warning: { fps: 6 },   // Faster pulse for warning
  critical: { fps: 10 }, // Rapid pulse for critical
};

// Convert FPS to PixiJS animationSpeed (60fps base)
export function getBombAnimationSpeed(fps: number): number {
  return fps / 60;
}

// Path to assets
const SPRITE_SHEET_PATH = '/assets/sf2/effects/hadouken_9grid_alpha_nogrid.png';
const ATLAS_PATH = '/assets/sf2/effects/hadouken_9grid_alpha_nogrid.json';

// Frame definitions from atlas (frame names)
// Using only the first frame of each row to avoid mirrored flickering
// Each row represents a different bomb state
const FRAME_GROUPS = {
  idle: ['fx_0'],      // Blue energy - first frame only (no animation flicker)
  warning: ['fx_3'],   // Yellow/orange fiery - first frame only
  critical: ['fx_6'],  // Blue with fiery accents - first frame only
};

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

    // Group frames by animation state
    const bombFrames: BombSpriteFrames = {
      idle: FRAME_GROUPS.idle.map(name => frames[name]).filter(Boolean),
      warning: FRAME_GROUPS.warning.map(name => frames[name]).filter(Boolean),
      critical: FRAME_GROUPS.critical.map(name => frames[name]).filter(Boolean),
    };

    // Verify we have all frames (1 per animation state - static sprites to avoid flicker)
    if (bombFrames.idle.length !== 1 || bombFrames.warning.length !== 1 || bombFrames.critical.length !== 1) {
      console.warn('BombSpriteSheet: Some frames missing, falling back to legacy. Got:', {
        idle: bombFrames.idle.length,
        warning: bombFrames.warning.length,
        critical: bombFrames.critical.length,
      });
      console.warn('Available frames:', Object.keys(frames));
      return null;
    }

    console.log('BombSpriteSheet: Loaded hadouken bomb sprites successfully');
    return bombFrames;

  } catch (error) {
    console.error('BombSpriteSheet: Failed to load hadouken sprites:', error);
    return null;
  }
}
