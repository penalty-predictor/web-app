export type Mode = "player" | "goalkeeper";
export type InputMode = "direct" | "powerbars";
export type DifficultyKey = keyof typeof import("./constants").DIFFICULTY;

export interface ShotParams {
  // All values normalized to goal space (x,y in meters relative to left-bottom post)
  targetX: number; // 0..GOAL_W
  targetY: number; // 0..GOAL_H
  power: number;   // 0..1
  curve: number;   // -1..1 (not used in MVP)
}

export interface GKAction {
  diveX: number; // 0..GOAL_W
  heightBias: number; // 0..1
  committed: boolean;
}

export interface RoundResult {
  scored: boolean;
  savedByGK: boolean;
  offTarget: boolean;
  params: ShotParams;
}

export interface GameState {
  mode: Mode;
  inputMode: InputMode;
  difficulty: DifficultyKey;
  round: number;            // 1..ROUNDS (+ sudden death later)
  youScore: number;
  oppScore: number;
  youCountry: string;
  oppCountry: string;
  isPaused: boolean;
  isAnimating: boolean;     // during shot/save animation
  lastResult?: RoundResult;
}