import { Texture, Rectangle, TextureSource, ImageSource } from 'pixi.js';

// Sprite frame dimensions
const SPRITE_SIZE = 32;

// Asset paths - relative to public folder
const ASSET_PATHS: Record<string, string> = {
  idleFront: '/assets/character/idle-front.png',
  idleBack: '/assets/character/idle-back.png',
  idleLeft: '/assets/character/idle-left.png',
  idleRight: '/assets/character/idle-right.png',
  walkFront: '/assets/character/walk-front.png',
  walkBack: '/assets/character/walk-back.png',
  walkLeft: '/assets/character/walk-left.png',
  walkRight: '/assets/character/walk-right.png',
  deathFront: '/assets/character/death-front.png',
  winFront: '/assets/character/win-front.png',
  dynamite: '/assets/items/dynamite.png',
  box: '/assets/items/box.png',
  ground: '/assets/terrain/ground.png',
  grass: '/assets/terrain/grass.png',
  rock: '/assets/terrain/rock.png',
  wall: '/assets/terrain/wall.png',
  wood: '/assets/terrain/wood.png',
  explosion: '/assets/fxs/explosion.png',
};

// Frame counts for each sprite sheet
const FRAME_COUNTS: Record<string, number> = {
  idleFront: 4,
  idleBack: 4,
  idleLeft: 4,
  idleRight: 4,
  walkFront: 4,
  walkBack: 4,
  walkLeft: 4,
  walkRight: 4,
  deathFront: 5,
  winFront: 2,
  dynamite: 9, // 3x3 grid
  explosion: 8,
  ground: 4,
  grass: 4,
  rock: 4,
  wall: 4,
  wood: 4,
  box: 9, // 3x3 grid
};

export interface LoadedAssets {
  character: {
    idleFront: Texture[];
    idleBack: Texture[];
    idleLeft: Texture[];
    idleRight: Texture[];
    walkFront: Texture[];
    walkBack: Texture[];
    walkLeft: Texture[];
    walkRight: Texture[];
    deathFront: Texture[];
    winFront: Texture[];
  };
  items: {
    dynamite: Texture[];
    box: Texture[];
  };
  terrain: {
    ground: Texture[];
    grass: Texture[];
    rock: Texture[];
    wall: Texture[];
    wood: Texture[];
  };
  fxs: {
    explosion: Texture[];
  };
}

// Load a single image and return a texture
function loadImage(src: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const source = new ImageSource({ resource: img });
        const texture = new Texture({ source });
        resolve(texture);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  });
}

// Extract frames from a horizontal sprite sheet
function extractHorizontalFrames(texture: Texture, frameCount: number): Texture[] {
  const frames: Texture[] = [];
  const source = texture.source as TextureSource;

  for (let i = 0; i < frameCount; i++) {
    const frameRect = new Rectangle(i * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE);
    const frame = new Texture({
      source: source,
      frame: frameRect,
    });
    frames.push(frame);
  }

  return frames;
}

// Extract frames from a grid sprite sheet (like dynamite 3x3)
function extractGridFrames(texture: Texture, cols: number, rows: number): Texture[] {
  const frames: Texture[] = [];
  const source = texture.source as TextureSource;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const frameRect = new Rectangle(col * SPRITE_SIZE, row * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE);
      const frame = new Texture({
        source: source,
        frame: frameRect,
      });
      frames.push(frame);
    }
  }

  return frames;
}

export async function loadAssets(): Promise<LoadedAssets> {
  console.log('Starting asset loading...');

  try {
    // Load all images in parallel using native Image loading
    const loadPromises: Promise<[string, Texture]>[] = Object.entries(ASSET_PATHS).map(
      async ([key, path]) => {
        const texture = await loadImage(path);
        return [key, texture] as [string, Texture];
      }
    );

    // Add timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Asset loading timeout after 15 seconds')), 15000);
    });

    const results = await Promise.race([
      Promise.all(loadPromises),
      timeoutPromise,
    ]) as [string, Texture][];

    // Convert to map
    const textures: Record<string, Texture> = {};
    for (const [key, texture] of results) {
      textures[key] = texture;
    }

    console.log('Assets loaded successfully!');

    // Extract frames from the loaded textures
    return {
      character: {
        idleFront: extractHorizontalFrames(textures.idleFront, FRAME_COUNTS.idleFront),
        idleBack: extractHorizontalFrames(textures.idleBack, FRAME_COUNTS.idleBack),
        idleLeft: extractHorizontalFrames(textures.idleLeft, FRAME_COUNTS.idleLeft),
        idleRight: extractHorizontalFrames(textures.idleRight, FRAME_COUNTS.idleRight),
        walkFront: extractHorizontalFrames(textures.walkFront, FRAME_COUNTS.walkFront),
        walkBack: extractHorizontalFrames(textures.walkBack, FRAME_COUNTS.walkBack),
        walkLeft: extractHorizontalFrames(textures.walkLeft, FRAME_COUNTS.walkLeft),
        walkRight: extractHorizontalFrames(textures.walkRight, FRAME_COUNTS.walkRight),
        deathFront: extractHorizontalFrames(textures.deathFront, FRAME_COUNTS.deathFront),
        winFront: extractHorizontalFrames(textures.winFront, FRAME_COUNTS.winFront),
      },
      items: {
        dynamite: extractGridFrames(textures.dynamite, 3, 3),
        box: extractGridFrames(textures.box, 3, 3),
      },
      terrain: {
        ground: extractHorizontalFrames(textures.ground, FRAME_COUNTS.ground),
        grass: extractHorizontalFrames(textures.grass, FRAME_COUNTS.grass),
        rock: extractHorizontalFrames(textures.rock, FRAME_COUNTS.rock),
        wall: extractHorizontalFrames(textures.wall, FRAME_COUNTS.wall),
        wood: extractHorizontalFrames(textures.wood, FRAME_COUNTS.wood),
      },
      fxs: {
        explosion: extractHorizontalFrames(textures.explosion, FRAME_COUNTS.explosion),
      },
    };
  } catch (err) {
    console.error('Failed to load assets:', err);
    throw err;
  }
}

export { SPRITE_SIZE };
