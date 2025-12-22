import {
  Application,
  Container,
  Graphics,
  Sprite,
  AnimatedSprite,
  Texture,
} from 'pixi.js';
import {
  Cell,
  Player,
  VisibleBomb,
  Explosion,
  PowerUpDrop,
  AbilityId,
} from '@bomberroyal/shared';
import { LoadedAssets, SPRITE_SIZE } from './AssetLoader';
import { ScreenShake } from './effects/ScreenShake';
import { SpectatorCamera } from './SpectatorCamera';

// Game tile size (sprites scaled 2x)
export const TILE_SIZE = 64;

// Player color tints
const PLAYER_COLORS: Record<string, number> = {
  red: 0xFF6B6B,
  blue: 0x4ECDC4,
  green: 0x95E881,
  yellow: 0xFFE66D,
};

// Power-up colors
const POWERUP_COLORS: Record<AbilityId, number> = {
  bomb_count: 0xFF6B6B,
  blast_radius: 0xFFE66D,
  bomb_kick: 0x4ECDC4,
  remote_detonate: 0x9B59B6,
  speed: 0x2ECC71,
  shield: 0x3498DB,
  piercing_bomb: 0xE74C3C,
  eagle_eye: 0xF39C12,
  quick_fuse: 0xE91E63,
};

// Animation speeds
const ANIM_SPEEDS = {
  idle: 0.08,
  walk: 0.15,
  death: 0.12,
  win: 0.1,
  bombNormal: 0.1,
  bombWarning: 0.3,
  explosion: 0.2,
};

type Direction = 'up' | 'down' | 'left' | 'right';

interface PlayerSpriteData {
  container: Container;
  sprite: AnimatedSprite;
  shieldGraphics: Graphics;
  lastDirection: Direction;
  isWalking: boolean;
  isDead: boolean;
  isWinner: boolean;
}

interface BombSpriteData {
  sprite: AnimatedSprite;
  isWarning: boolean;
}

export class PixiRenderer {
  private app: Application;
  private assets: LoadedAssets;
  private screenShake: ScreenShake;
  private spectatorCamera: SpectatorCamera;

  // Layers (z-ordered)
  private layers: {
    ground: Container;
    items: Container;
    blocks: Container;
    bombs: Container;
    players: Container;
    explosions: Container;
    shrinkZone: Container;
    fog: Container;
  };

  // Sprite caches
  private groundSprites: Map<string, Sprite> = new Map();
  private blockSprites: Map<string, Sprite> = new Map();
  private playerSprites: Map<string, PlayerSpriteData> = new Map();
  private bombSprites: Map<string, BombSpriteData> = new Map();
  private explosionSprites: Map<string, AnimatedSprite[]> = new Map();
  private powerUpSprites: Map<string, Container> = new Map();

  // Graphics for overlays
  private fogGraphics: Graphics;
  private shrinkGraphics: Graphics;

  // Grid dimensions
  private gridWidth: number = 15;
  private gridHeight: number = 13;

  // Track previous explosions for screen shake
  private lastExplosionIds: Set<string> = new Set();

  constructor(app: Application, assets: LoadedAssets) {
    this.app = app;
    this.assets = assets;
    this.screenShake = new ScreenShake(app);
    this.spectatorCamera = new SpectatorCamera(app);

    // Create layers
    this.layers = {
      ground: new Container(),
      items: new Container(),
      blocks: new Container(),
      bombs: new Container(),
      players: new Container(),
      explosions: new Container(),
      shrinkZone: new Container(),
      fog: new Container(),
    };

    // Add layers in z-order
    Object.values(this.layers).forEach(layer => {
      this.app.stage.addChild(layer);
    });

    // Create graphics objects
    this.fogGraphics = new Graphics();
    this.layers.fog.addChild(this.fogGraphics);

    this.shrinkGraphics = new Graphics();
    this.layers.shrinkZone.addChild(this.shrinkGraphics);

    // Set up spectator camera
    this.spectatorCamera.setFogLayer(this.layers.fog);
  }

  setGridSize(width: number, height: number): void {
    this.gridWidth = width;
    this.gridHeight = height;
  }

  // Initialize the ground layer (called once when game starts)
  initGround(): void {
    this.layers.ground.removeChildren();
    this.groundSprites.clear();

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const key = `${x},${y}`;
        // Randomly select a ground variant
        const variant = Math.floor(Math.random() * this.assets.terrain.ground.length);
        const sprite = new Sprite(this.assets.terrain.ground[variant]);
        sprite.x = x * TILE_SIZE;
        sprite.y = y * TILE_SIZE;
        sprite.scale.set(TILE_SIZE / SPRITE_SIZE);
        this.layers.ground.addChild(sprite);
        this.groundSprites.set(key, sprite);
      }
    }
  }

  // Update blocks based on visible cells
  updateBlocks(visibleCells: { x: number; y: number; type: Cell }[]): void {
    // Track which blocks should exist
    const expectedBlocks = new Set<string>();

    for (const { x, y, type } of visibleCells) {
      if (type === 'destructible' || type === 'indestructible') {
        const key = `${x},${y}`;
        expectedBlocks.add(key);

        if (!this.blockSprites.has(key)) {
          // Create new block sprite
          let texture: Texture;
          if (type === 'destructible') {
            const variant = Math.floor(Math.random() * this.assets.items.box.length);
            texture = this.assets.items.box[variant];
          } else {
            const variant = Math.floor(Math.random() * this.assets.terrain.wall.length);
            texture = this.assets.terrain.wall[variant];
          }

          const sprite = new Sprite(texture);
          sprite.x = x * TILE_SIZE;
          sprite.y = y * TILE_SIZE;
          sprite.scale.set(TILE_SIZE / SPRITE_SIZE);
          this.layers.blocks.addChild(sprite);
          this.blockSprites.set(key, sprite);
        }
      }
    }

    // Remove blocks that are no longer present
    for (const [key, sprite] of this.blockSprites) {
      if (!expectedBlocks.has(key)) {
        this.layers.blocks.removeChild(sprite);
        sprite.destroy();
        this.blockSprites.delete(key);
      }
    }
  }

  // Update player sprites
  updatePlayers(players: Player[], self: Player): void {
    const allPlayers = [...players];
    // Add self if not in the list
    if (!allPlayers.find(p => p.id === self.id)) {
      allPlayers.push(self);
    }

    const expectedPlayers = new Set<string>();

    for (const player of allPlayers) {
      expectedPlayers.add(player.id);

      let data = this.playerSprites.get(player.id);

      if (!data) {
        // Create new player sprite
        const container = new Container();
        const sprite = new AnimatedSprite(this.assets.character.idleFront);
        sprite.anchor.set(0.5, 0.5);
        sprite.scale.set(TILE_SIZE / SPRITE_SIZE);
        sprite.animationSpeed = ANIM_SPEEDS.idle;
        sprite.play();

        // Apply player color tint
        sprite.tint = PLAYER_COLORS[player.color] || 0xFFFFFF;

        // Shield graphics
        const shieldGraphics = new Graphics();
        shieldGraphics.visible = false;

        container.addChild(sprite);
        container.addChild(shieldGraphics);
        this.layers.players.addChild(container);

        data = {
          container,
          sprite,
          shieldGraphics,
          lastDirection: 'down',
          isWalking: false,
          isDead: false,
          isWinner: false,
        };
        this.playerSprites.set(player.id, data);
      }

      // Update position
      data.container.x = player.position.x * TILE_SIZE + TILE_SIZE / 2;
      data.container.y = player.position.y * TILE_SIZE + TILE_SIZE / 2;

      // Update alive/dead state
      if (!player.alive && !data.isDead) {
        // Start death animation
        data.isDead = true;
        data.sprite.textures = this.assets.character.deathFront;
        data.sprite.animationSpeed = ANIM_SPEEDS.death;
        data.sprite.loop = false;
        data.sprite.gotoAndPlay(0);
      }

      // Update shield
      if (player.hasShield && !data.isDead) {
        data.shieldGraphics.visible = true;
        data.shieldGraphics.clear();
        data.shieldGraphics.setStrokeStyle({ width: 3, color: 0x3498DB });
        data.shieldGraphics.circle(0, 0, TILE_SIZE / 2 + 5);
        data.shieldGraphics.stroke();
        // Rotate shield
        data.shieldGraphics.rotation += 0.02;
      } else {
        data.shieldGraphics.visible = false;
      }

      // Highlight self
      if (player.id === self.id && !data.isDead) {
        data.sprite.alpha = 1;
      } else if (!data.isDead) {
        data.sprite.alpha = 0.9;
      }
    }

    // Remove players that are no longer visible
    for (const [id, data] of this.playerSprites) {
      if (!expectedPlayers.has(id)) {
        this.layers.players.removeChild(data.container);
        data.sprite.destroy();
        data.shieldGraphics.destroy();
        data.container.destroy();
        this.playerSprites.delete(id);
      }
    }
  }

  // Update player direction/animation based on movement
  updatePlayerAnimation(playerId: string, direction: Direction | null, isWalking: boolean): void {
    const data = this.playerSprites.get(playerId);
    if (!data || data.isDead) return;

    const dir = direction || data.lastDirection;
    if (direction) {
      data.lastDirection = direction;
    }

    const needsUpdate = data.isWalking !== isWalking || direction !== null;
    if (!needsUpdate) return;

    data.isWalking = isWalking;

    // Select appropriate animation
    let textures: Texture[];
    if (isWalking) {
      switch (dir) {
        case 'up':
          textures = this.assets.character.walkBack;
          break;
        case 'down':
          textures = this.assets.character.walkFront;
          break;
        case 'left':
          textures = this.assets.character.walkLeft;
          break;
        case 'right':
          textures = this.assets.character.walkRight;
          break;
      }
      data.sprite.animationSpeed = ANIM_SPEEDS.walk;
    } else {
      switch (dir) {
        case 'up':
          textures = this.assets.character.idleBack;
          break;
        case 'down':
          textures = this.assets.character.idleFront;
          break;
        case 'left':
          textures = this.assets.character.idleLeft;
          break;
        case 'right':
          textures = this.assets.character.idleRight;
          break;
      }
      data.sprite.animationSpeed = ANIM_SPEEDS.idle;
    }

    // Only update if textures changed
    if (data.sprite.textures !== textures) {
      data.sprite.textures = textures;
      data.sprite.play();
    }
  }

  // Show win animation for a player
  showWinAnimation(playerId: string): void {
    const data = this.playerSprites.get(playerId);
    if (!data || data.isWinner) return;

    data.isWinner = true;
    data.sprite.textures = this.assets.character.winFront;
    data.sprite.animationSpeed = ANIM_SPEEDS.win;
    data.sprite.loop = true;
    data.sprite.play();
  }

  // Update bombs
  updateBombs(bombs: VisibleBomb[]): void {
    const expectedBombs = new Set<string>();

    for (const bomb of bombs) {
      if (bomb.visibility === 'hidden') continue;

      expectedBombs.add(bomb.id);
      let data = this.bombSprites.get(bomb.id);

      if (!data) {
        // Create new bomb sprite
        const sprite = new AnimatedSprite(this.assets.items.dynamite);
        sprite.anchor.set(0.5, 0.5);
        sprite.scale.set(TILE_SIZE / SPRITE_SIZE * 0.8);
        sprite.animationSpeed = ANIM_SPEEDS.bombNormal;
        sprite.play();

        sprite.x = bomb.position.x * TILE_SIZE + TILE_SIZE / 2;
        sprite.y = bomb.position.y * TILE_SIZE + TILE_SIZE / 2;

        this.layers.bombs.addChild(sprite);
        data = { sprite, isWarning: false };
        this.bombSprites.set(bomb.id, data);
      }

      // Update position (for sliding bombs)
      data.sprite.x = bomb.position.x * TILE_SIZE + TILE_SIZE / 2;
      data.sprite.y = bomb.position.y * TILE_SIZE + TILE_SIZE / 2;

      // Update warning state
      const shouldWarn = bomb.visibility === 'warning';
      if (shouldWarn && !data.isWarning) {
        data.isWarning = true;
        data.sprite.animationSpeed = ANIM_SPEEDS.bombWarning;
        data.sprite.tint = 0xFF4444;
      } else if (!shouldWarn && data.isWarning) {
        data.isWarning = false;
        data.sprite.animationSpeed = ANIM_SPEEDS.bombNormal;
        data.sprite.tint = 0xFFFFFF;
      }
    }

    // Remove bombs that exploded
    for (const [id, data] of this.bombSprites) {
      if (!expectedBombs.has(id)) {
        this.layers.bombs.removeChild(data.sprite);
        data.sprite.destroy();
        this.bombSprites.delete(id);
      }
    }
  }

  // Update explosions
  updateExplosions(explosions: Explosion[]): void {
    const expectedExplosions = new Set<string>();

    for (const explosion of explosions) {
      expectedExplosions.add(explosion.id);

      // Check if this is a new explosion (trigger screen shake)
      if (!this.lastExplosionIds.has(explosion.id)) {
        this.screenShake.shake(8, 200);
        this.lastExplosionIds.add(explosion.id);
      }

      if (!this.explosionSprites.has(explosion.id)) {
        // Create explosion sprites for each cell
        const sprites: AnimatedSprite[] = [];

        for (const cell of explosion.cells) {
          const sprite = new AnimatedSprite(this.assets.fxs.explosion);
          sprite.anchor.set(0.5, 0.5);
          sprite.scale.set(TILE_SIZE / SPRITE_SIZE);
          sprite.animationSpeed = ANIM_SPEEDS.explosion;
          sprite.loop = false;
          sprite.x = cell.x * TILE_SIZE + TILE_SIZE / 2;
          sprite.y = cell.y * TILE_SIZE + TILE_SIZE / 2;

          sprite.onComplete = () => {
            sprite.visible = false;
          };

          sprite.play();
          this.layers.explosions.addChild(sprite);
          sprites.push(sprite);
        }

        this.explosionSprites.set(explosion.id, sprites);
      }
    }

    // Clean up finished explosions
    for (const [id, sprites] of this.explosionSprites) {
      if (!expectedExplosions.has(id)) {
        for (const sprite of sprites) {
          this.layers.explosions.removeChild(sprite);
          sprite.destroy();
        }
        this.explosionSprites.delete(id);
        this.lastExplosionIds.delete(id);
      }
    }
  }

  // Update power-ups
  updatePowerUps(powerUps: PowerUpDrop[]): void {
    const expectedPowerUps = new Set<string>();

    for (const powerUp of powerUps) {
      expectedPowerUps.add(powerUp.id);

      if (!this.powerUpSprites.has(powerUp.id)) {
        // Create power-up icon
        const container = new Container();
        container.x = powerUp.position.x * TILE_SIZE + TILE_SIZE / 2;
        container.y = powerUp.position.y * TILE_SIZE + TILE_SIZE / 2;

        // Get color based on first choice (or default yellow)
        const color = powerUp.choices.length > 0
          ? POWERUP_COLORS[powerUp.choices[0]] || 0xFFE66D
          : 0xFFE66D;

        const graphics = new Graphics();
        graphics.circle(0, 0, 20);
        graphics.fill({ color });
        graphics.circle(0, 0, 20);
        graphics.stroke({ width: 3, color: 0xFFFFFF });

        // Add glow effect
        graphics.alpha = 0.9;

        container.addChild(graphics);
        this.layers.items.addChild(container);
        this.powerUpSprites.set(powerUp.id, container);
      }
    }

    // Remove collected power-ups
    for (const [id, container] of this.powerUpSprites) {
      if (!expectedPowerUps.has(id)) {
        this.layers.items.removeChild(container);
        container.destroy({ children: true });
        this.powerUpSprites.delete(id);
      }
    }
  }

  // Update fog of war
  updateFog(
    visibleCells: { x: number; y: number; type: Cell }[],
    exploredCells: { x: number; y: number; type: Cell }[]
  ): void {
    if (this.spectatorCamera.isEnabled()) return;

    const visibleSet = new Set<string>();
    visibleCells.forEach(({ x, y }) => visibleSet.add(`${x},${y}`));

    const exploredSet = new Set<string>();
    exploredCells.forEach(({ x, y }) => exploredSet.add(`${x},${y}`));

    this.fogGraphics.clear();

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const key = `${x},${y}`;

        if (!visibleSet.has(key)) {
          if (exploredSet.has(key)) {
            // Previously seen - grey fog
            this.fogGraphics.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            this.fogGraphics.fill({ color: 0x000000, alpha: 0.6 });
          } else {
            // Never seen - black fog
            this.fogGraphics.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            this.fogGraphics.fill({ color: 0x000000, alpha: 0.9 });
          }
        }
      }
    }
  }

  // Update shrink zone
  updateShrinkZone(
    active: boolean,
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    this.shrinkGraphics.clear();

    if (!active) return;

    // Warning pulse effect
    const warningAlpha = 0.2 + Math.sin(Date.now() / 200) * 0.15;

    // Draw danger zone (outside safe bounds)
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const inSafeZone = x >= bounds.minX && x <= bounds.maxX &&
                          y >= bounds.minY && y <= bounds.maxY;

        if (!inSafeZone) {
          // Danger zone - solid red
          this.shrinkGraphics.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          this.shrinkGraphics.fill({ color: 0xFF0000, alpha: 0.5 });
        } else {
          // Warning edge (1 tile inside safe zone)
          const onEdge = x === bounds.minX || x === bounds.maxX ||
                        y === bounds.minY || y === bounds.maxY;
          if (onEdge) {
            this.shrinkGraphics.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            this.shrinkGraphics.fill({ color: 0xFF0000, alpha: warningAlpha });
          }
        }
      }
    }
  }

  // Enable spectator mode
  enableSpectatorMode(): void {
    this.spectatorCamera.enable();
  }

  // Disable spectator mode
  disableSpectatorMode(): void {
    this.spectatorCamera.disable();
  }

  // Clean up all sprites and reset state
  reset(): void {
    // Clear all sprite caches
    for (const sprite of this.blockSprites.values()) {
      sprite.destroy();
    }
    this.blockSprites.clear();

    for (const data of this.playerSprites.values()) {
      data.sprite.destroy();
      data.shieldGraphics.destroy();
      data.container.destroy();
    }
    this.playerSprites.clear();

    for (const data of this.bombSprites.values()) {
      data.sprite.destroy();
    }
    this.bombSprites.clear();

    for (const sprites of this.explosionSprites.values()) {
      for (const sprite of sprites) {
        sprite.destroy();
      }
    }
    this.explosionSprites.clear();
    this.lastExplosionIds.clear();

    for (const container of this.powerUpSprites.values()) {
      container.destroy({ children: true });
    }
    this.powerUpSprites.clear();

    // Clear layers
    this.layers.ground.removeChildren();
    this.layers.items.removeChildren();
    this.layers.blocks.removeChildren();
    this.layers.bombs.removeChildren();
    this.layers.players.removeChildren();
    this.layers.explosions.removeChildren();

    // Reset graphics
    this.fogGraphics.clear();
    this.shrinkGraphics.clear();

    // Re-add graphics to layers
    this.layers.fog.addChild(this.fogGraphics);
    this.layers.shrinkZone.addChild(this.shrinkGraphics);

    // Reset spectator
    this.disableSpectatorMode();

    // Clear ground sprites map
    this.groundSprites.clear();
  }

  // Destroy renderer
  destroy(): void {
    this.reset();
    this.app.destroy(true);
  }
}
