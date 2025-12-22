import { Room, PlayerStats } from '@bomberroyal/shared';

interface GameOverProps {
  room: Room;
  playerId: string;
  stats: Record<string, PlayerStats> | null;
  onPlayAgain: () => void;
  onLeave: () => void;
}

function GameOver({ room, playerId, stats, onPlayAgain, onLeave }: GameOverProps) {
  const winner = room.players.find((p) => p.id === room.gameState.winner);
  const isWinner = room.gameState.winner === playerId;
  const currentPlayer = room.players.find((p) => p.id === playerId);

  // Sort players by kills, then blocks destroyed
  const sortedPlayers = [...room.players].sort((a, b) => {
    const statsA = stats?.[a.id] || a.stats;
    const statsB = stats?.[b.id] || b.stats;
    if (statsB.kills !== statsA.kills) return statsB.kills - statsA.kills;
    return statsB.blocksDestroyed - statsA.blocksDestroyed;
  });

  return (
    <div className="container">
      <h1 className="title">BOMBER ROYALE</h1>

      {/* Winner Announcement */}
      <div
        className="card"
        style={{
          textAlign: 'center',
          marginBottom: '20px',
          background: isWinner
            ? 'linear-gradient(135deg, rgba(46, 213, 115, 0.2), rgba(46, 213, 115, 0.05))'
            : 'linear-gradient(135deg, rgba(255, 71, 87, 0.2), rgba(255, 71, 87, 0.05))',
          border: isWinner ? '2px solid #2ed573' : '2px solid #ff4757',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            marginBottom: '10px',
          }}
        >
          {isWinner ? 'VICTORY!' : 'GAME OVER'}
        </p>
        <p
          style={{
            fontSize: '24px',
            color: winner ? `var(--player-${winner.color})` : 'var(--text-secondary)',
            marginBottom: '10px',
          }}
        >
          {winner ? `${winner.displayName} WINS!` : 'DRAW'}
        </p>
        {isWinner && (
          <p style={{ fontSize: '10px', color: '#2ed573' }}>
            Congratulations! You are the last one standing!
          </p>
        )}
      </div>

      {/* Stats Table */}
      <div className="card">
        <h2
          style={{
            fontSize: '12px',
            marginBottom: '15px',
            color: 'var(--text-secondary)',
          }}
        >
          FINAL STANDINGS
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--text-secondary)' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>PLAYER</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>KILLS</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>DEATHS</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>BLOCKS</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>POWERUPS</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, index) => {
                const playerStats = stats?.[player.id] || player.stats;
                const isCurrentPlayer = player.id === playerId;
                const isPlayerWinner = player.id === room.gameState.winner;

                return (
                  <tr
                    key={player.id}
                    style={{
                      background: isCurrentPlayer
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <td style={{ padding: '8px' }}>
                      {isPlayerWinner ? '👑' : index + 1}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: `var(--player-${player.color})`,
                          }}
                        />
                        <span style={{ color: `var(--player-${player.color})` }}>
                          {player.displayName}
                          {isCurrentPlayer && ' (you)'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {playerStats.kills}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {playerStats.deaths}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {playerStats.blocksDestroyed}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {playerStats.powerUpsCollected}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Your Stats Summary */}
      {currentPlayer && (
        <div
          className="card"
          style={{
            marginTop: '20px',
            background: 'rgba(55, 66, 250, 0.1)',
            border: '1px solid #3742fa',
          }}
        >
          <h2
            style={{
              fontSize: '12px',
              marginBottom: '15px',
              color: '#3742fa',
            }}
          >
            YOUR PERFORMANCE
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '15px',
              textAlign: 'center',
            }}
          >
            <div>
              <p style={{ fontSize: '20px', color: '#ff4757' }}>
                {stats?.[playerId]?.kills || currentPlayer.stats.kills}
              </p>
              <p style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>
                KILLS
              </p>
            </div>
            <div>
              <p style={{ fontSize: '20px', color: '#ffa502' }}>
                {stats?.[playerId]?.blocksDestroyed || currentPlayer.stats.blocksDestroyed}
              </p>
              <p style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>
                BLOCKS
              </p>
            </div>
            <div>
              <p style={{ fontSize: '20px', color: '#2ed573' }}>
                {stats?.[playerId]?.powerUpsCollected || currentPlayer.stats.powerUpsCollected}
              </p>
              <p style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>
                POWERUPS
              </p>
            </div>
          </div>
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
        <button onClick={onLeave} className="secondary" style={{ flex: 1 }}>
          Leave
        </button>
        <button onClick={onPlayAgain} style={{ flex: 1 }}>
          Play Again
        </button>
      </div>
    </div>
  );
}

export default GameOver;
