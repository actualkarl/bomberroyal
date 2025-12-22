import { Cell, Player, VisibleBomb, Explosion, PowerUpDrop } from '@bomberroyal/shared';

interface GridProps {
  visibleCells: { x: number; y: number; type: Cell }[];
  exploredCells: { x: number; y: number; type: Cell }[];
  players: Player[];
  self: Player;
  bombs: VisibleBomb[];
  explosions: Explosion[];
  powerUps: PowerUpDrop[];
  gridWidth: number;
  gridHeight: number;
}

const CELL_SIZE = 40; // pixels

const cellColors: Record<Cell, string> = {
  empty: '#1a1a2e',
  destructible: '#8b7355',
  indestructible: '#2d2d44',
  shrink_death: '#4a0e0e',
};

const playerColors: Record<string, string> = {
  red: '#ff4757',
  blue: '#3742fa',
  green: '#2ed573',
  yellow: '#ffa502',
};

// Dimmed versions of cell colors for explored but not visible cells
const dimmedCellColors: Record<Cell, string> = {
  empty: '#0f0f1a',
  destructible: '#4a3d2e',
  indestructible: '#1a1a2a',
  shrink_death: '#2a0808',
};

function Grid({
  visibleCells,
  exploredCells,
  players,
  self,
  bombs,
  explosions,
  powerUps,
  gridWidth,
  gridHeight,
}: GridProps) {
  // Create a map of visible cells for quick lookup
  const visibleMap = new Map<string, Cell>();
  visibleCells.forEach(({ x, y, type }) => {
    visibleMap.set(`${x},${y}`, type);
  });

  // Create a map of explored (but not visible) cells
  const exploredMap = new Map<string, Cell>();
  exploredCells.forEach(({ x, y, type }) => {
    exploredMap.set(`${x},${y}`, type);
  });

  // Create explosion cell set
  const explosionCells = new Set<string>();
  explosions.forEach((exp) => {
    exp.cells.forEach(({ x, y }) => {
      explosionCells.add(`${x},${y}`);
    });
  });

  // Create bomb position map
  const bombMap = new Map<string, VisibleBomb>();
  bombs.forEach((bomb) => {
    bombMap.set(`${bomb.position.x},${bomb.position.y}`, bomb);
  });

  // Create player position map
  const playerMap = new Map<string, Player>();
  [...players, self].forEach((player) => {
    if (player.alive) {
      playerMap.set(`${player.position.x},${player.position.y}`, player);
    }
  });

  // Create power-up position map
  const powerUpMap = new Map<string, PowerUpDrop>();
  powerUps.forEach((pu) => {
    powerUpMap.set(`${pu.position.x},${pu.position.y}`, pu);
  });

  const renderCell = (x: number, y: number) => {
    const key = `${x},${y}`;
    const cellType = visibleMap.get(key);
    const exploredCellType = exploredMap.get(key);
    const isVisible = cellType !== undefined;
    const isExplored = exploredCellType !== undefined;
    const isExplosion = explosionCells.has(key);
    const bomb = bombMap.get(key);
    const player = playerMap.get(key);
    const powerUp = powerUpMap.get(key);

    // Base cell style
    let backgroundColor = '#0a0a14'; // Full fog color (never seen)
    let border = 'none';

    if (isVisible) {
      // Currently visible - full brightness
      backgroundColor = cellColors[cellType];
      border = '1px solid #2d2d44';
    } else if (isExplored) {
      // Previously explored but not visible - dimmed
      backgroundColor = dimmedCellColors[exploredCellType];
      border = '1px solid #1a1a2a';
    }

    if (isExplosion) {
      backgroundColor = '#ff6b35';
    }

    return (
      <div
        key={key}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          backgroundColor,
          border,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.1s',
        }}
      >
        {/* Destructible block pattern - visible */}
        {isVisible && cellType === 'destructible' && (
          <div
            style={{
              position: 'absolute',
              inset: 4,
              border: '2px solid #6b5344',
              borderRadius: 2,
            }}
          />
        )}

        {/* Destructible block pattern - explored (dimmed) */}
        {!isVisible && isExplored && exploredCellType === 'destructible' && (
          <div
            style={{
              position: 'absolute',
              inset: 4,
              border: '2px solid #3a2a20',
              borderRadius: 2,
              opacity: 0.5,
            }}
          />
        )}

        {/* Indestructible block pattern - visible */}
        {isVisible && cellType === 'indestructible' && (
          <div
            style={{
              position: 'absolute',
              inset: 2,
              background: 'linear-gradient(135deg, #3d3d5c 25%, #2d2d44 75%)',
              borderRadius: 2,
            }}
          />
        )}

        {/* Indestructible block pattern - explored (dimmed) */}
        {!isVisible && isExplored && exploredCellType === 'indestructible' && (
          <div
            style={{
              position: 'absolute',
              inset: 2,
              background: 'linear-gradient(135deg, #25253a 25%, #1a1a2a 75%)',
              borderRadius: 2,
              opacity: 0.5,
            }}
          />
        )}

        {/* Power-up */}
        {powerUp && isVisible && (
          <div
            style={{
              width: CELL_SIZE * 0.6,
              height: CELL_SIZE * 0.6,
              backgroundColor: '#ffa502',
              borderRadius: '4px',
              border: '2px solid #ff6b35',
              boxShadow: '0 0 10px #ffa502',
              position: 'absolute',
              zIndex: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            ?
          </div>
        )}

        {/* Bomb */}
        {bomb && bomb.visibility !== 'hidden' && (
          <div
            style={{
              width: CELL_SIZE * 0.7,
              height: CELL_SIZE * 0.7,
              backgroundColor: '#1a1a2e',
              borderRadius: '50%',
              border: '3px solid #ff4757',
              boxShadow:
                bomb.visibility === 'warning'
                  ? '0 0 15px #ff4757'
                  : '0 0 5px #ff4757',
              animation:
                bomb.visibility === 'warning' ? 'pulse 0.2s infinite' : 'none',
              position: 'absolute',
              zIndex: 10,
            }}
          />
        )}

        {/* Player */}
        {player && (
          <div
            style={{
              width: CELL_SIZE * 0.8,
              height: CELL_SIZE * 0.8,
              backgroundColor: playerColors[player.color],
              borderRadius: '50%',
              boxShadow: player.hasShield
                ? `0 0 15px #3742fa, 0 0 25px #3742fa`
                : `0 0 10px ${playerColors[player.color]}`,
              border: player.hasShield
                ? '3px solid #3742fa'
                : player.id === self.id
                ? '3px solid white'
                : '2px solid #1a1a2e',
              position: 'absolute',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#1a1a2e',
            }}
          >
            {player.displayName.charAt(0).toUpperCase()}
            {/* Shield indicator */}
            {player.hasShield && (
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: '2px dashed #3742fa',
                  animation: 'spin 3s linear infinite',
                }}
              />
            )}
          </div>
        )}

        {/* Explosion effect */}
        {isExplosion && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle, #ffaa00 0%, #ff6b35 50%, transparent 100%)',
              animation: 'explode 0.5s ease-out',
              zIndex: 5,
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridWidth}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${gridHeight}, ${CELL_SIZE}px)`,
        gap: 0,
        border: '2px solid #3742fa',
        boxShadow: '0 0 20px rgba(55, 66, 250, 0.3)',
      }}
    >
      {Array.from({ length: gridHeight }, (_, y) =>
        Array.from({ length: gridWidth }, (_, x) => renderCell(x, y))
      )}
    </div>
  );
}

export default Grid;
