import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  VisibleGameState,
  PowerUpType,
  PlayerStats,
} from '@bomberroyal/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface PowerUpChoice {
  powerUpId: string;
  choices: PowerUpType[];
}

export interface DeathAnnouncement {
  victimId: string;
  victimName: string;
  killerId: string | null;
  killerName: string | null;
  timestamp: number;
}

export interface UseSocketReturn {
  socket: TypedSocket | null;
  isConnected: boolean;
  room: Room | null;
  playerId: string | null;
  gameState: VisibleGameState | null;
  powerUpChoice: PowerUpChoice | null;
  deathAnnouncements: DeathAnnouncement[];
  finalStats: Record<string, PlayerStats> | null;
  error: string | null;
  joinRoom: (code: string, displayName: string) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  move: (direction: 'up' | 'down' | 'left' | 'right') => void;
  placeBomb: () => void;
  stopAction: () => void;
  remoteDetonate: () => void;
  choosePowerUp: (powerUpId: string, choice: PowerUpType) => void;
  playAgain: () => void;
  clearError: () => void;
  addBots: (count: number) => void;
  removeBots: () => void;
}

// Determine server URL based on environment
const getServerUrl = () => {
  // In production, connect to same origin (Railway serves both client and server)
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // In development, connect to local server
  return 'http://localhost:3001';
};

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<VisibleGameState | null>(null);
  const [powerUpChoice, setPowerUpChoice] = useState<PowerUpChoice | null>(null);
  const [deathAnnouncements, setDeathAnnouncements] = useState<DeathAnnouncement[]>([]);
  const [finalStats, setFinalStats] = useState<Record<string, PlayerStats> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket: TypedSocket = io(getServerUrl(), {
      transports: ['websocket', 'polling'], // polling as fallback for production
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setRoom(null);
      setPlayerId(null);
      setGameState(null);
      console.log('Disconnected from server');
    });

    socket.on('room-joined', ({ room, playerId }) => {
      setRoom(room);
      setPlayerId(playerId);
      setError(null);
    });

    socket.on('room-state', ({ room }) => {
      setRoom(room);
    });

    socket.on('player-joined', ({ player }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: [...prev.players, player],
        };
      });
    });

    socket.on('player-left', ({ playerId }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.filter((p) => p.id !== playerId),
        };
      });
    });

    socket.on('player-ready-changed', ({ playerId, ready }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === playerId ? { ...p, ready } : p
          ),
        };
      });
    });

    socket.on('game-countdown', ({ seconds }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          gameState: {
            ...prev.gameState,
            phase: 'COUNTDOWN',
            countdown: seconds,
          },
        };
      });
    });

    socket.on('game-started', () => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          gameState: {
            ...prev.gameState,
            phase: 'PLAYING',
          },
        };
      });
    });

    socket.on('game-state', ({ state }) => {
      setGameState(state);
    });

    socket.on('game-over', ({ winnerId, stats }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          gameState: {
            ...prev.gameState,
            phase: 'GAME_OVER',
            winner: winnerId,
          },
        };
      });
      setFinalStats(stats);
      setGameState(null);
      setPowerUpChoice(null);
    });

    socket.on('error', ({ message }) => {
      setError(message);
    });

    socket.on('powerup-choice', ({ powerUpId, choices }) => {
      setPowerUpChoice({ powerUpId, choices });
    });

    socket.on('player-died', ({ playerId: victimId, killerId }) => {
      setRoom((prevRoom) => {
        if (!prevRoom) return null;

        // Find player names from room
        const victim = prevRoom.players.find(p => p.id === victimId);
        const killer = killerId ? prevRoom.players.find(p => p.id === killerId) : null;

        if (victim) {
          const announcement: DeathAnnouncement = {
            victimId,
            victimName: victim.displayName,
            killerId,
            killerName: killer?.displayName || null,
            timestamp: Date.now(),
          };

          setDeathAnnouncements((prev) => [...prev, announcement]);

          // Auto-remove announcement after 3 seconds
          setTimeout(() => {
            setDeathAnnouncements((prev) =>
              prev.filter((a) => a.timestamp !== announcement.timestamp)
            );
          }, 3000);
        }

        return prevRoom;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((code: string, displayName: string) => {
    socketRef.current?.emit('join-room', { code, displayName });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave-room');
    setRoom(null);
    setPlayerId(null);
    setGameState(null);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    socketRef.current?.emit('player-ready', { ready });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start-game');
  }, []);

  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    socketRef.current?.emit('player-move', { direction });
  }, []);

  const placeBomb = useCallback(() => {
    socketRef.current?.emit('place-bomb');
  }, []);

  const stopAction = useCallback(() => {
    socketRef.current?.emit('stop-action');
  }, []);

  const remoteDetonate = useCallback(() => {
    socketRef.current?.emit('remote-detonate');
  }, []);

  const choosePowerUp = useCallback((powerUpId: string, choice: PowerUpType) => {
    socketRef.current?.emit('choose-powerup', { powerUpId, choice });
    setPowerUpChoice(null);
  }, []);

  const playAgain = useCallback(() => {
    socketRef.current?.emit('play-again');
    setFinalStats(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const addBots = useCallback((count: number) => {
    socketRef.current?.emit('add-bots', { count });
  }, []);

  const removeBots = useCallback(() => {
    socketRef.current?.emit('remove-bots');
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    room,
    playerId,
    gameState,
    powerUpChoice,
    deathAnnouncements,
    finalStats,
    error,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    move,
    placeBomb,
    stopAction,
    remoteDetonate,
    choosePowerUp,
    playAgain,
    clearError,
    addBots,
    removeBots,
  };
}
