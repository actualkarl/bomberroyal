import { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { Cell, Player, VisibleBomb, Explosion, PowerUpDrop, ShrinkZone } from '@bomberroyal/shared';
import { LoadedAssets, PixiRenderer, TILE_SIZE } from '../rendering';
import { useAssetPreload } from '../hooks/useAssetPreload';

interface PixiGridProps {
  visibleCells: { x: number; y: number; type: Cell }[];
  exploredCells: { x: number; y: number; type: Cell }[];
  players: Player[];
  self: Player;
  bombs: VisibleBomb[];
  explosions: Explosion[];
  powerUps: PowerUpDrop[];
  gridWidth: number;
  gridHeight: number;
  currentDirection: 'up' | 'down' | 'left' | 'right' | null;
  isMoving: boolean;
  gamePhase: string;
  winnerId: string | null;
  shrinkZone: ShrinkZone;
}

function PixiGrid({
  visibleCells,
  exploredCells,
  players,
  self,
  bombs,
  explosions,
  powerUps,
  gridWidth,
  gridHeight,
  currentDirection,
  isMoving,
  gamePhase,
  winnerId,
  shrinkZone,
}: PixiGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const rendererRef = useRef<PixiRenderer | null>(null);
  const assetsRef = useRef<LoadedAssets | null>(null);
  const [pixiReady, setPixiReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groundInitialized = useRef(false);

  // Use preloaded assets from lobby
  const { loading: assetsLoading, error: assetsError, assets: preloadedAssets } = useAssetPreload();

  // Initialize PixiJS application once assets are ready
  useEffect(() => {
    if (!containerRef.current || assetsLoading || !preloadedAssets) return;

    let mounted = true;

    const init = async () => {
      try {
        // Use cached assets
        const assets = preloadedAssets;
        if (!mounted) return;
        assetsRef.current = assets;

        // Create PixiJS application
        const app = new Application();
        await app.init({
          width: gridWidth * TILE_SIZE,
          height: gridHeight * TILE_SIZE,
          backgroundColor: 0x1a1a2e,
          antialias: false, // Pixel art should be crisp
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          preference: 'webgl', // Force WebGL instead of WebGPU
        });

        if (!mounted) {
          app.destroy(true);
          return;
        }

        // Add canvas to DOM
        containerRef.current?.appendChild(app.canvas);
        appRef.current = app;

        // Create renderer
        const renderer = new PixiRenderer(app, assets);
        renderer.setGridSize(gridWidth, gridHeight);
        rendererRef.current = renderer;

        setPixiReady(true);
      } catch (err) {
        console.error('Failed to initialize PixiJS:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize graphics');
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
      if (appRef.current) {
        appRef.current = null;
      }
      groundInitialized.current = false;
    };
  }, [gridWidth, gridHeight, assetsLoading, preloadedAssets]);

  // Combined loading state
  const loading = assetsLoading || !pixiReady;

  // Update renderer when game state changes
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || loading) return;

    // Initialize ground once
    if (!groundInitialized.current) {
      renderer.initGround();
      groundInitialized.current = true;
    }

    // Update all layers
    renderer.updateBlocks(visibleCells, exploredCells);
    renderer.updatePlayers(players, self);
    renderer.updateBombs(bombs);
    renderer.updateExplosions(explosions);
    renderer.updatePowerUps(powerUps);
    renderer.updateFog(visibleCells, exploredCells);
  }, [visibleCells, exploredCells, players, self, bombs, explosions, powerUps, loading]);

  // Update player animation based on movement
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || loading) return;

    renderer.updatePlayerAnimation(self.id, currentDirection, isMoving);
  }, [currentDirection, isMoving, self.id, loading]);

  // Update shrink zone (need continuous updates for pulsing effect)
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || loading) return;

    renderer.updateShrinkZone(shrinkZone.active, shrinkZone.currentBounds);
  }, [shrinkZone, loading]);

  // Animate shrink zone pulse
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || loading || !shrinkZone.active) return;

    let animationFrame: number;
    const animate = () => {
      renderer.updateShrinkZone(shrinkZone.active, shrinkZone.currentBounds);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [shrinkZone.active, shrinkZone.currentBounds, loading]);

  // Handle spectator mode when player dies
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || loading) return;

    if (!self.alive && gamePhase === 'PLAYING') {
      renderer.enableSpectatorMode();
    }
  }, [self.alive, gamePhase, loading]);

  // Handle win animation
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || loading) return;

    if (gamePhase === 'GAME_OVER' && winnerId) {
      renderer.showWinAnimation(winnerId);
    }
  }, [gamePhase, winnerId, loading]);

  const displayError = error || assetsError;

  return (
    <div
      ref={containerRef}
      style={{
        width: gridWidth * TILE_SIZE,
        height: gridHeight * TILE_SIZE,
        border: '2px solid #3742fa',
        boxShadow: '0 0 20px rgba(55, 66, 250, 0.3)',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {displayError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff4757',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <p>Graphics Error</p>
          <p style={{ fontSize: '12px', color: '#888' }}>{displayError}</p>
        </div>
      )}
      {!displayError && loading && (
        <span style={{ color: '#3742fa' }}>Loading sprites...</span>
      )}
    </div>
  );
}

export default PixiGrid;
