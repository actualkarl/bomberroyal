import { useEffect } from 'react';
import { UseSocketReturn } from '../hooks/useSocket';
import { Player } from '@bomberroyal/shared';
import { startAssetPreload } from '../hooks/useAssetPreload';

interface LobbyProps {
  socketState: UseSocketReturn;
}

function Lobby({ socketState }: LobbyProps) {
  const { room, playerId, leaveRoom, setReady, startGame, addBots, removeBots, error } = socketState;

  // Start preloading game assets when entering lobby
  useEffect(() => {
    startAssetPreload();
  }, []);

  if (!room || !playerId) return null;

  const currentPlayer = room.players.find((p) => p.id === playerId);
  const isReady = currentPlayer?.ready ?? false;
  const allReady = room.players.length >= 1 && room.players.every((p) => p.ready);
  const isCountdown = room.gameState.phase === 'COUNTDOWN';
  const isHost = room.hostId === playerId;
  const botCount = room.players.filter((p) => p.id.startsWith('bot-')).length;
  const canAddBots = room.players.length < 4;

  const getPlayerColorClass = (color: string) => `player-color-${color}`;

  return (
    <div className="container">
      <h1 className="title">BOMBER ROYALE</h1>

      {/* Room Code */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <p
          style={{
            fontSize: '10px',
            color: 'var(--text-secondary)',
            marginBottom: '10px',
          }}
        >
          ROOM CODE
        </p>
        <p
          style={{
            fontSize: '24px',
            letterSpacing: '8px',
            color: 'var(--accent-primary)',
          }}
        >
          {room.code}
        </p>
        <p
          style={{
            fontSize: '8px',
            color: 'var(--text-secondary)',
            marginTop: '10px',
          }}
        >
          Share this code with friends to join!
        </p>
      </div>

      {/* Countdown */}
      {isCountdown && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            background: 'var(--accent-primary)',
          }}
        >
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>GAME STARTING</p>
          <p style={{ fontSize: '48px' }}>{room.gameState.countdown}</p>
        </div>
      )}

      {/* Players List */}
      <div className="card">
        <h2
          style={{
            fontSize: '12px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>PLAYERS</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {room.players.length}/4
          </span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {room.players.map((player: Player) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: player.id === playerId ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: '1px solid var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Color indicator */}
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: `var(--player-${player.color})`,
                  }}
                />
                {/* Name */}
                <span className={getPlayerColorClass(player.color)}>
                  {player.displayName}
                  {player.id.startsWith('bot-') && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '8px',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      BOT
                    </span>
                  )}
                  {player.id === room.hostId && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '8px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      HOST
                    </span>
                  )}
                  {player.id === playerId && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '8px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      (YOU)
                    </span>
                  )}
                </span>
              </div>
              {/* Ready status */}
              <span
                style={{
                  fontSize: '10px',
                  color: player.ready ? 'var(--success)' : 'var(--text-secondary)',
                }}
              >
                {player.ready ? 'READY' : 'NOT READY'}
              </span>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 4 - room.players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                border: '1px dashed var(--text-secondary)',
                opacity: 0.5,
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                Waiting for player...
              </span>
            </div>
          ))}
        </div>

        {error && <p className="error-message">{error}</p>}

        {/* Bot Controls (host only) */}
        {isHost && !isCountdown && (
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '20px',
              padding: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--text-secondary)',
            }}
          >
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
              AI BOTS:
            </span>
            <button
              onClick={() => addBots(1)}
              disabled={!canAddBots}
              className="secondary"
              style={{ fontSize: '10px', padding: '6px 12px' }}
            >
              +1 Bot
            </button>
            <button
              onClick={() => addBots(3)}
              disabled={!canAddBots}
              className="secondary"
              style={{ fontSize: '10px', padding: '6px 12px' }}
            >
              Fill Bots
            </button>
            {botCount > 0 && (
              <button
                onClick={removeBots}
                className="secondary"
                style={{ fontSize: '10px', padding: '6px 12px', background: 'var(--danger)' }}
              >
                Remove All
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '20px',
          }}
        >
          <button onClick={leaveRoom} className="secondary" style={{ flex: 1 }}>
            Leave
          </button>

          {allReady ? (
            <button
              onClick={startGame}
              disabled={isCountdown}
              style={{ flex: 2 }}
            >
              Start Game
            </button>
          ) : (
            <button
              onClick={() => setReady(!isReady)}
              disabled={isCountdown}
              style={{
                flex: 2,
                background: isReady ? 'var(--text-secondary)' : 'var(--success)',
              }}
            >
              {isReady ? 'Cancel Ready' : 'Ready Up'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;
