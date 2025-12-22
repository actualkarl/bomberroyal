import { useEffect, useCallback, useRef, useState } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

interface UseInputProps {
  onMove: (direction: Direction) => void;
  onPlaceBomb: () => void;
  onStopAction: () => void;
  onRemoteDetonate: () => void;
  enabled: boolean;
}

interface UseInputReturn {
  currentDirection: Direction | null;
  isMoving: boolean;
}

export function useInput({ onMove, onPlaceBomb, onStopAction, onRemoteDetonate, enabled }: UseInputProps): UseInputReturn {
  const [currentDirection, setCurrentDirection] = useState<Direction | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const moveTimeoutRef = useRef<number | null>(null);
  const lastMoveTime = useRef(0);
  const lastBombTime = useRef(0);
  const lastStopTime = useRef(0);
  const lastDetonateTime = useRef(0);
  const moveDelay = 100; // ms between moves (rate limiting)
  const bombDelay = 250; // ms between bomb placements
  const stopDelay = 100; // ms between stop actions
  const detonateDelay = 200; // ms between detonate actions

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const now = Date.now();

      // Handle spacebar - can be bomb OR stop action
      // The server will handle the logic of what to do
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();

        // Try to stop kicked bombs first
        if (now - lastStopTime.current >= stopDelay) {
          lastStopTime.current = now;
          onStopAction();
        }

        // Also try to place bomb (server handles if allowed)
        if (now - lastBombTime.current >= bombDelay) {
          lastBombTime.current = now;
          onPlaceBomb();
        }
        return;
      }

      // Handle remote detonate (E or Q key)
      if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'q') {
        e.preventDefault();
        if (now - lastDetonateTime.current >= detonateDelay) {
          lastDetonateTime.current = now;
          onRemoteDetonate();
        }
        return;
      }

      // Handle movement
      if (now - lastMoveTime.current < moveDelay) return;

      let direction: Direction | null = null;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          direction = 'up';
          break;
        case 's':
        case 'arrowdown':
          direction = 'down';
          break;
        case 'a':
        case 'arrowleft':
          direction = 'left';
          break;
        case 'd':
        case 'arrowright':
          direction = 'right';
          break;
      }

      if (direction) {
        e.preventDefault();
        lastMoveTime.current = now;
        setCurrentDirection(direction);
        setIsMoving(true);
        onMove(direction);

        // Clear previous timeout
        if (moveTimeoutRef.current) {
          window.clearTimeout(moveTimeoutRef.current);
        }

        // Set timeout to stop walking animation after no input
        moveTimeoutRef.current = window.setTimeout(() => {
          setIsMoving(false);
        }, 150);
      }
    },
    [onMove, onPlaceBomb, onStopAction, onRemoteDetonate, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (moveTimeoutRef.current) {
        window.clearTimeout(moveTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  return { currentDirection, isMoving };
}
