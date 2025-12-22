import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  BotPersonality,
} from '@bomberroyal/shared';
import {
  getRoom,
  addPlayerToRoom,
  removePlayerFromRoom,
  setPlayerReady,
  allPlayersReady,
  setPlayerRoom,
  getPlayerRoom,
  removePlayerRoom,
  resetRoomForNewGame,
} from '../rooms.js';
import {
  startGameLoop,
  stopGameLoop,
  handlePlayerMove,
  handlePlaceBomb,
  handlePowerUpChoice,
  handleStopAction,
  handleRemoteDetonate,
} from '../game/GameLoop.js';
import {
  addBotsToRoom,
  removeBotsFromRoom,
  resetBotsForNewGame,
} from '../ai/BotManager.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: TypedServer): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join room
    socket.on('join-room', ({ code, displayName }) => {
      const trimmedName = displayName.trim().slice(0, 20);
      if (!trimmedName) {
        socket.emit('error', { message: 'Display name is required' });
        return;
      }

      const upperCode = code.toUpperCase();
      const result = addPlayerToRoom(upperCode, socket.id, trimmedName);

      if ('error' in result) {
        socket.emit('error', { message: result.error });
        return;
      }

      const { room, player } = result;

      // Track player's room
      setPlayerRoom(socket.id, upperCode);

      // Join socket.io room
      socket.join(upperCode);

      // Send room state to joining player
      socket.emit('room-joined', { room, playerId: socket.id });

      // Notify others
      socket.to(upperCode).emit('player-joined', { player });

      console.log(`${trimmedName} joined room ${upperCode}`);
    });

    // Leave room
    socket.on('leave-room', () => {
      handlePlayerLeave(socket, io);
    });

    // Player ready toggle
    socket.on('player-ready', ({ ready }) => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = setPlayerReady(code, socket.id, ready);
      if (!room) return;

      io.to(code).emit('player-ready-changed', {
        playerId: socket.id,
        ready,
      });
    });

    // Start game (any player can start when all ready)
    socket.on('start-game', () => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = getRoom(code);
      if (!room) return;

      // Check all ready
      if (!allPlayersReady(room)) {
        socket.emit('error', { message: 'Not all players are ready' });
        return;
      }

      // Start countdown
      room.gameState.phase = 'COUNTDOWN';
      room.gameState.countdown = 3;

      const countdownInterval = setInterval(() => {
        io.to(code).emit('game-countdown', {
          seconds: room.gameState.countdown,
        });

        room.gameState.countdown--;

        if (room.gameState.countdown < 0) {
          clearInterval(countdownInterval);
          room.gameState.phase = 'PLAYING';
          room.gameState.startedAt = Date.now();
          io.to(code).emit('game-started');

          // Start the game loop
          startGameLoop(room, io);

          console.log(`Game started in room ${code}`);
        }
      }, 1000);
    });

    // Player movement
    socket.on('player-move', ({ direction }) => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = getRoom(code);
      if (!room || room.gameState.phase !== 'PLAYING') return;

      handlePlayerMove(room, socket.id, direction);
    });

    // Place bomb
    socket.on('place-bomb', () => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = getRoom(code);
      if (!room || room.gameState.phase !== 'PLAYING') return;

      handlePlaceBomb(room, socket.id);
    });

    // Choose power-up
    socket.on('choose-powerup', ({ powerUpId, choice }) => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = getRoom(code);
      if (!room || room.gameState.phase !== 'PLAYING') return;

      handlePowerUpChoice(room, socket.id, powerUpId, choice);
    });

    // Stop action (spacebar stop for kick level 3 or speed brake)
    socket.on('stop-action', () => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = getRoom(code);
      if (!room || room.gameState.phase !== 'PLAYING') return;

      handleStopAction(room, socket.id);
    });

    // Remote detonate (E or Q key)
    socket.on('remote-detonate', () => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = getRoom(code);
      if (!room || room.gameState.phase !== 'PLAYING') return;

      handleRemoteDetonate(room, socket.id);
    });

    // Play again - reset room for new game
    socket.on('play-again', () => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = getRoom(code);
      if (!room || room.gameState.phase !== 'GAME_OVER') return;

      // Reset room state
      resetRoomForNewGame(room);

      // Reset bot states for new game
      resetBotsForNewGame(code);

      // Notify all players of new room state
      io.to(code).emit('room-state', { room });

      console.log(`Room ${code} reset for new game`);
    });

    // Add bots to room (host only)
    socket.on('add-bots', ({ count }) => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = getRoom(code);
      if (!room) return;

      // Only allow in lobby
      if (room.gameState.phase !== 'LOBBY') {
        socket.emit('error', { message: 'Can only add bots in lobby' });
        return;
      }

      // Only host can add bots
      if (room.hostId !== socket.id) {
        socket.emit('error', { message: 'Only host can add bots' });
        return;
      }

      // Limit bot count (max 3 bots, total 4 players)
      const humanCount = room.players.filter(p => !p.id.startsWith('bot-')).length;
      const maxBots = Math.min(count, 4 - humanCount);

      if (maxBots <= 0) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      // Add bots
      addBotsToRoom(room, maxBots);

      // Notify all players of new room state
      io.to(code).emit('room-state', { room });

      console.log(`Added ${maxBots} bots to room ${code}`);
    });

    // Remove all bots from room (host only)
    socket.on('remove-bots', () => {
      const code = getPlayerRoom(socket.id);
      if (!code) return;

      const room = getRoom(code);
      if (!room) return;

      // Only allow in lobby
      if (room.gameState.phase !== 'LOBBY') {
        socket.emit('error', { message: 'Can only remove bots in lobby' });
        return;
      }

      // Only host can remove bots
      if (room.hostId !== socket.id) {
        socket.emit('error', { message: 'Only host can remove bots' });
        return;
      }

      // Remove bot players from room
      room.players = room.players.filter(p => !p.id.startsWith('bot-'));

      // Clean up bot state
      removeBotsFromRoom(code);

      // Notify all players of new room state
      io.to(code).emit('room-state', { room });

      console.log(`Removed bots from room ${code}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      handlePlayerLeave(socket, io);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

function handlePlayerLeave(socket: TypedSocket, io: TypedServer): void {
  const code = getPlayerRoom(socket.id);
  if (!code) return;

  const result = removePlayerFromRoom(code, socket.id);

  // Leave socket.io room
  socket.leave(code);
  removePlayerRoom(socket.id);

  if (result) {
    const { room, newHostId } = result;

    // Notify remaining players
    io.to(code).emit('player-left', { playerId: socket.id });

    // If host changed, send updated room state
    if (newHostId) {
      io.to(code).emit('room-state', { room });
    }

    // If game was in progress and not enough players, end it
    if (room.gameState.phase === 'PLAYING') {
      const alivePlayers = room.players.filter((p) => p.alive);
      if (alivePlayers.length <= 1) {
        room.gameState.phase = 'GAME_OVER';
        room.gameState.winner = alivePlayers[0]?.id || null;
        stopGameLoop(code);

        io.to(code).emit('game-over', {
          winnerId: room.gameState.winner,
          stats: Object.fromEntries(
            room.players.map((p) => [p.id, p.stats])
          ),
        });
      }
    }
  } else {
    // Room was deleted (no players left)
    stopGameLoop(code);
  }
}
