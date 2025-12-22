import { Player, BotPersonality, BotState, BotAction, Cell, Bomb, Explosion, PowerUpDrop } from '@bomberroyal/shared';

export interface Position {
  x: number;
  y: number;
}

export interface Bot {
  id: string;
  personality: BotPersonality;
  player: Player;
  state: BotState;
  targetPosition: Position | null;
  lastDecisionTime: number;
}

// Game state view for bots (they see everything - no fog)
export interface BotGameView {
  grid: Cell[][];
  gridWidth: number;
  gridHeight: number;
  players: Player[];
  bombs: Bomb[];
  explosions: Explosion[];
  powerUps: PowerUpDrop[];
  shrinkBounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface BotPersonalityHandler {
  decide(bot: Bot, gameView: BotGameView, dangerTiles: Set<string>): BotAction;
}

export { BotAction, BotPersonality, BotState };
