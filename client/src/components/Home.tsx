import { useState } from 'react';
import { UseSocketReturn } from '../hooks/useSocket';

interface HomeProps {
  socketState: UseSocketReturn;
}

function Home({ socketState }: HomeProps) {
  const { joinRoom, error, clearError } = socketState;

  const [view, setView] = useState<'home' | 'create' | 'join'>('home');
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    if (!displayName.trim()) return;

    setIsCreating(true);
    clearError();

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      const data = await response.json();

      if (data.code) {
        // Join the room we just created
        joinRoom(data.code, displayName.trim());
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!displayName.trim() || !roomCode.trim()) return;
    clearError();
    joinRoom(roomCode.trim().toUpperCase(), displayName.trim());
  };

  if (view === 'create') {
    return (
      <div className="container">
        <h1 className="title">BOMBER ROYALE</h1>
        <div className="card">
          <h2 style={{ fontSize: '14px', marginBottom: '20px' }}>CREATE ROOM</h2>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
              }}
            >
              YOUR NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter name..."
              maxLength={20}
              style={{ width: '100%' }}
              autoFocus
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => setView('home')}
              className="secondary"
              style={{ flex: 1 }}
            >
              Back
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={!displayName.trim() || isCreating}
              style={{ flex: 1 }}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="container">
        <h1 className="title">BOMBER ROYALE</h1>
        <div className="card">
          <h2 style={{ fontSize: '14px', marginBottom: '20px' }}>JOIN ROOM</h2>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
              }}
            >
              YOUR NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter name..."
              maxLength={20}
              style={{ width: '100%' }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
              }}
            >
              ROOM CODE
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              style={{
                width: '100%',
                textTransform: 'uppercase',
                letterSpacing: '4px',
                textAlign: 'center',
              }}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => setView('home')}
              className="secondary"
              style={{ flex: 1 }}
            >
              Back
            </button>
            <button
              onClick={handleJoinRoom}
              disabled={!displayName.trim() || roomCode.length !== 6}
              style={{ flex: 1 }}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="title">BOMBER ROYALE</h1>
      <div className="card" style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize: '10px',
            color: 'var(--text-secondary)',
            marginBottom: '30px',
          }}
        >
          Battle Royale Bomberman for 2-4 players
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button onClick={() => setView('create')}>Create Room</button>
          <button onClick={() => setView('join')} className="secondary">
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
