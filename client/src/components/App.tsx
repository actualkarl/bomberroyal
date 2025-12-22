import { useSocket } from '../hooks/useSocket';
import Home from './Home';
import Lobby from './Lobby';
import Game from './Game';
import GameOver from './GameOver';

function App() {
  const socketState = useSocket();
  const { room, playerId, isConnected, finalStats, leaveRoom, playAgain } = socketState;

  if (!isConnected) {
    return (
      <div className="container">
        <h1 className="title">BOMBER ROYALE</h1>
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="pulse">Connecting to server...</p>
        </div>
      </div>
    );
  }

  // No room = show home screen
  if (!room) {
    return <Home socketState={socketState} />;
  }

  // In lobby
  if (room.gameState.phase === 'LOBBY' || room.gameState.phase === 'COUNTDOWN') {
    return <Lobby socketState={socketState} />;
  }

  // Game in progress
  if (room.gameState.phase === 'PLAYING') {
    return <Game socketState={socketState} winnerId={room.gameState.winner} />;
  }

  // Game over
  if (room.gameState.phase === 'GAME_OVER' && playerId) {
    return (
      <GameOver
        room={room}
        playerId={playerId}
        stats={finalStats}
        onPlayAgain={playAgain}
        onLeave={leaveRoom}
      />
    );
  }

  return null;
}

export default App;
