import { Assets, Texture, Rectangle } from 'pixi.js';

// Sprite frame dimensions
const SPRITE_SIZE = 32;

// Asset paths
const ASSET_PATHS = {
  // Character sprites
  character: {
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
  },
  // Items
  items: {
    dynamite: '/assets/items/dynamite.png',
    box: '/assets/items/box.png',
  },
  // Terrain
  terrain: {
    ground: '/assets/terrain/ground.png',
    wall: '/assets/terrain/wall.png',
  },
  // Effects
  fxs: {
    explosion: '/assets/fxs/explosion.png',
  },
};

// Frame counts for each sprite sheet
const FRAME_COUNTS = {
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
  wall: 4,
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
    wall: Texture[];
  };
  fxs: {
    explosion: Texture[];
  };
}

// Extract frames from a horizontal sprite sheet
function extractHorizontalFrames(texture: Texture, frameCount: number): Texture[] {
  const frames: Texture[] = [];
  const baseTexture = texture.source;

  for (let i = 0; i < frameCount; i++) {
    const frame = new Texture({
      source: baseTexture,
      frame: new Rectangle(i * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE),
    });
    frames.push(frame);
  }

  return frames;
}

// Extract frames from a grid sprite sheet (like dynamite 3x3)
function extractGridFrames(texture: Texture, cols: number, rows: number): Texture[] {
  const frames: Texture[] = [];
  const baseTexture = texture.source;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const frame = new Texture({
        source: baseTexture,
        frame: new Rectangle(col * SPRITE_SIZE, row * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE),
      });
      frames.push(frame);
    }
  }

  return frames;
}

export async function loadAssets(): Promise<LoadedAssets> {
  // Load all base textures
  const [
    idleFront, idleBack, idleLeft, idleRight,
    walkFront, walkBack, walkLeft, walkRight,
    deathFront, winFront,
    dynamite, box,
    ground, wall,
    explosion,
  ] = await Promise.all([
    Assets.load(ASSET_PATHS.character.idleFront),
    Assets.load(ASSET_PATHS.character.idleBack),
    Assets.load(ASSET_PATHS.character.idleLeft),
    Assets.load(ASSET_PATHS.character.idleRight),
    Assets.load(ASSET_PATHS.character.walkFront),
    Assets.load(ASSET_PATHS.character.walkBack),
    Assets.load(ASSET_PATHS.character.walkLeft),
    Assets.load(ASSET_PATHS.character.walkRight),
    Assets.load(ASSET_PATHS.character.deathFront),
    Assets.load(ASSET_PATHS.character.winFront),
    Assets.load(ASSET_PATHS.items.dynamite),
    Assets.load(ASSET_PATHS.items.box),
    Assets.load(ASSET_PATHS.terrain.ground),
    Assets.load(ASSET_PATHS.terrain.wall),
    Assets.load(ASSET_PATHS.fxs.explosion),
  ]);

  return {
    character: {
      idleFront: extractHorizontalFrames(idleFront, FRAME_COUNTS.idleFront),
      idleBack: extractHorizontalFrames(idleBack, FRAME_COUNTS.idleBack),
      idleLeft: extractHorizontalFrames(idleLeft, FRAME_COUNTS.idleLeft),
      idleRight: extractHorizontalFrames(idleRight, FRAME_COUNTS.idleRight),
      walkFront: extractHorizontalFrames(walkFront, FRAME_COUNTS.walkFront),
      walkBack: extractHorizontalFrames(walkBack, FRAME_COUNTS.walkBack),
      walkLeft: extractHorizontalFrames(walkLeft, FRAME_COUNTS.walkLeft),
      walkRight: extractHorizontalFrames(walkRight, FRAME_COUNTS.walkRight),
      deathFront: extractHorizontalFrames(deathFront, FRAME_COUNTS.deathFront),
      winFront: extractHorizontalFrames(winFront, FRAME_COUNTS.winFront),
    },
    items: {
      dynamite: extractGridFrames(dynamite, 3, 3),
      box: extractGridFrames(box, 3, 3),
    },
    terrain: {
      ground: extractHorizontalFrames(ground, FRAME_COUNTS.ground),
      wall: extractHorizontalFrames(wall, FRAME_COUNTS.wall),
    },
    fxs: {
      explosion: extractHorizontalFrames(explosion, FRAME_COUNTS.explosion),
    },
  };
}

export { SPRITE_SIZE };
