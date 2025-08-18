import { GOAL_W, GOAL_H } from "./constants";
import type { ShotParams, GKAction } from "./types";

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function resolveShot(shot: ShotParams, gk: GKAction) {
  // Check if shot is off target - should be more strict
  // Off target if outside goal boundaries (with small margin for edge cases)
  const margin = 0.1; // m - small margin for edge cases
  const offTarget = shot.targetX < -margin || 
                    shot.targetX > GOAL_W + 1 + margin ||
                    shot.targetY < -margin || 
                    shot.targetY > GOAL_H + 1 + margin;

  if (offTarget) return { scored: false, saved: false, offTarget: true };

  // GK "save radius" scales with difficulty & power; here fixed small circle
  const saveRadius = 0.7; // meters
  const dx = shot.targetX - gk.diveX;
  const dy = shot.targetY - gk.heightBias * GOAL_H;
  const dist = Math.hypot(dx, dy);

  const saved = gk.committed && dist <= saveRadius;
  const scored = !saved && !offTarget;

  return { scored, saved, offTarget: false };
}

export function gkPolicy(targetX: number, difficulty: "easy"|"normal"|"hard"): GKAction {
  // Dumb heuristic GK: partial mirror with slight error
  const noise = difficulty === "easy" ? 0.6 : difficulty === "normal" ? 0.4 : 0.28;
  const diveX = clamp(targetX + (Math.random()-0.5) * noise, 0, GOAL_W);
  const heightBias = clamp(0.35 + (Math.random()-0.5) * 0.3, 0, 1);
  return { diveX, heightBias, committed: true };
}