import { UseSocketReturn } from '../hooks/useSocket';
import { useInput } from '../hooks/useInput';
import PixiGrid from './PixiGrid';
import PowerUpModal from './PowerUpModal';

interface GameProps {
  socketState: UseSocketReturn;
  winnerId?: string | null;
}

function Game({ socketState, winnerId = null }: GameProps) {
  const { room, playerId, gameState, powerUpChoice, move, placeBomb, stopAction, remoteDetonate, choosePowerUp } = socketState;

  // Handle keyboard input (disabled when power-up modal is open)
  const { currentDirection, isMoving } = useInput({
    onMove: move,
    onPlaceBomb: placeBomb,
    onStopAction: stopAction,
    onRemoteDetonate: remoteDetonate,
    enabled: !!gameState && gameState.phase === 'PLAYING' && !powerUpChoice,
  });

  if (!room || !playerId) return null;

  // Waiting for game state from server
  if (!gameState) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '14px', marginBottom: '20px' }}>
            LOADING GAME...
          </h2>
          <p className="pulse" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Waiting for game state...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '600px',
          marginBottom: '20px',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-secondary)',
            }}
          >
            ROOM:
          </span>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '12px',
              color: 'var(--accent-primary)',
            }}
          >
            {room.code}
          </span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              fontSize: '14px',
              color: `var(--player-${gameState.self.color})`,
            }}
          >
            {gameState.self.displayName}
          </span>
        </div>

        <div>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-secondary)',
            }}
          >
            TICK:
          </span>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '12px',
            }}
          >
            {gameState.tick}
          </span>
        </div>
      </div>

      {/* Game Grid */}
      <PixiGrid
        visibleCells={gameState.visibleCells}
        exploredCells={gameState.exploredCells || []}
        players={gameState.visiblePlayers}
        self={gameState.self}
        bombs={gameState.visibleBombs}
        explosions={gameState.visibleExplosions}
        powerUps={gameState.visiblePowerUps}
        gridWidth={room.settings.gridSize.width}
        gridHeight={room.settings.gridSize.height}
        currentDirection={currentDirection}
        isMoving={isMoving}
        gamePhase={gameState.phase}
        winnerId={winnerId}
        shrinkZone={gameState.shrinkZone}
      />

      {/* Controls hint */}
      <div
        style={{
          marginTop: '20px',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        <p>WASD/Arrows to move | SPACE to place bomb | E/Q to detonate</p>
        <p style={{ marginTop: '5px' }}>
          Position: ({gameState.self.position.x}, {gameState.self.position.y}) | Bombs: {gameState.self.bombCount}/{gameState.self.maxBombs}
          {gameState.self.canKickBombs && ` | Kick Lv.${gameState.self.kickLevel}`}
          {gameState.self.canRemoteDetonate && ` | Detonate Lv.${gameState.self.remoteDetonateLevel}`}
        </p>
      </div>

      {/* Player list and stats */}
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {room.players.map((player) => (
          <div
            key={player.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: player.alive ? 1 : 0.5,
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: `var(--player-${player.color})`,
              }}
            />
            <span
              style={{
                fontSize: '10px',
                textDecoration: player.alive ? 'none' : 'line-through',
              }}
            >
              {player.displayName}
              {player.id === playerId && ' (you)'}
            </span>
          </div>
        ))}
      </div>

      {/* Shrink Zone Warning */}
      {gameState.shrinkZone.active && (
        <div
          style={{
            marginTop: '15px',
            padding: '8px 16px',
            background: 'rgba(255, 75, 75, 0.2)',
            border: '1px solid #ff4b4b',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#ff4b4b',
          }}
        >
          ZONE SHRINKING - Stay in the safe area!
        </div>
      )}

      {/* Power-up Modal */}
      {powerUpChoice && (
        <PowerUpModal powerUpChoice={powerUpChoice} onChoose={choosePowerUp} />
      )}
    </div>
  );
}

export default Game;
