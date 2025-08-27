import { useState, useEffect, useCallback, useRef } from 'react';

// Types
type GameState = 'ready' | 'aiming' | 'shooting' | 'scoring';
type PlayerState = 'ready' | 'shooting' | 'follow-through';
type GoalkeeperState = 'ready' | 'diving-left' | 'diving-right';

interface GameStats {
  goals: number;
  streak: number;
  shots: number;
  best: number;
}

interface ShotHistoryItem {
  id: number;
  target: { x: number; y: number; z: number };
  result: string;
  isGoal: boolean;
  timestamp: Date;
}

interface BallPosition {
  x: number;
  y: number;
}

interface GoalkeeperPosition {
  x: number;
  y: number;
  diving: boolean;
}

// Game configuration
const GOAL_CONFIG = { width: 500, height: 200, depth: 30 };

const GK = {
  baseReactionMs: 180,
  decideMs: 1200,
  reachHx: 60,
  reachHy: 42,
  lowShotScaleMin: 0.55,
  bodyRadius: 18,
};

const RNG = {
  keeperCorrectGuessP: 0.55,
  diveOffsetMax: 12,
  reachJitterMin: 0.9,
  reachJitterMax: 1.08,
  reactionJitterMs: 120,
};

export function useGameLogic() {
  // Game state
  const [gameState, setGameState] = useState<GameState>('ready');
  const [ballPosition, setBallPosition] = useState<BallPosition>({ x: 50, y: 85 });
  const [playerState, setPlayerState] = useState<PlayerState>('ready');
  const [goalkeeperState, setGoalkeeperState] = useState<GoalkeeperState>('ready');
  const [goalkeeperPosition, setGoalkeeperPosition] = useState<GoalkeeperPosition>({ x: 50, y: 50, diving: false });
  
  // Game results and stats
  const [result, setResult] = useState('');
  const [stats, setStats] = useState<GameStats>({ goals: 0, streak: 0, shots: 0, best: 0 });
  const [shotHistory, setShotHistory] = useState<ShotHistoryItem[]>([]);
  const [shotTarget, setShotTarget] = useState<{ x: number; y: number; z: number } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  // Keeper refs
  const gkDiveFieldRef = useRef<{ x: number; y: number } | null>(null);
  const gkDiveScreenRef = useRef<{ x: number; y: number } | null>(null);
  const gkHxHyRef = useRef<{ hx: number; hy: number } | null>(null);
  const gkReactionMsRef = useRef<number>(GK.baseReactionMs);

  // Helper functions
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Reset game function
  const resetGame = useCallback(() => {
    setTimeout(() => {
      setGameState('ready');
      setBallPosition({ x: 50, y: 85 });
      setPlayerState('ready');
      setGoalkeeperState('ready');
      setGoalkeeperPosition({ x: 50, y: 50, diving: false });
      setResult('');
      setShotTarget(null);

      // Clear per-shot keeper params
      gkDiveFieldRef.current = null;
      gkDiveScreenRef.current = null;
      gkHxHyRef.current = null;
      gkReactionMsRef.current = GK.baseReactionMs;
    }, 2500);
  }, []);

  // Restart game function
  const handleRestart = useCallback(() => {
    setGameOver(false);
    setAttemptsLeft(5);
    setStats({ goals: 0, streak: 0, shots: 0, best: 0 });
    setShotHistory([]);
    setResult('');
    setShotTarget(null);
    setGameState('ready');
    setBallPosition({ x: 50, y: 85 });
    setPlayerState('ready');
    setGoalkeeperState('ready');
    setGoalkeeperPosition({ x: 50, y: 50, diving: false });

    // Clear per-shot keeper params
    gkDiveFieldRef.current = null;
    gkDiveScreenRef.current = null;
    gkHxHyRef.current = null;
    gkReactionMsRef.current = GK.baseReactionMs;
  }, []);

  // Animate shot function
  const animateShot = useCallback((target: { x: number; y: number; z: number }) => {
    setGameState('shooting');
    setPlayerState('shooting');
    setShotTarget(target);

    // When the player kicks
    setTimeout(() => setPlayerState('follow-through'), 200);

    // Keeper dives after (randomized) reaction time
    const reactionMs = GK.baseReactionMs + (Math.random() * 2 - 1) * RNG.reactionJitterMs;
    gkReactionMsRef.current = reactionMs;

    setTimeout(() => {
      const halfW = GOAL_CONFIG.width / 2;
      const thirdsThreshold = halfW * 0.6;
      const trueThird: 'left' | 'center' | 'right' =
        target.x < -thirdsThreshold ? 'left' :
        target.x > thirdsThreshold ? 'right' : 'center';

      const correct = Math.random() < RNG.keeperCorrectGuessP;
      let plannedThird: 'left' | 'center' | 'right' = trueThird;
      if (!correct) {
        const options = (['left', 'center', 'right'] as const).filter(t => t !== trueThird);
        plannedThird = options[Math.floor(Math.random() * options.length)];
      }

      const [leftC, centerC, rightC] = [-halfW * 0.66, 0, halfW * 0.66];
      const targetX = plannedThird === 'left' ? leftC : plannedThird === 'right' ? rightC : centerC;
      const targetY = GOAL_CONFIG.height * 0.45;

      // Dive jitter
      const jitterX = (Math.random() * 2 - 1) * RNG.diveOffsetMax;
      const jitterY = (Math.random() * 2 - 1) * RNG.diveOffsetMax * 0.6;

      const diveX = targetX + jitterX;
      const diveY = targetY + jitterY;

      gkDiveFieldRef.current = { x: diveX, y: diveY };

      setGoalkeeperState(
        plannedThird === 'left' ? 'diving-left' :
        plannedThird === 'right' ? 'diving-right' : 'ready'
      );
      setGoalkeeperPosition({ x: 50, y: 50, diving: true });
    }, Math.max(0, reactionMs));

    // Decide the outcome
    setTimeout(() => {
      const inGoalArea = Math.abs(target.x) <= GOAL_CONFIG.width / 2 && 
                         target.y >= 0 && target.y <= GOAL_CONFIG.height && 
                         target.z <= GOAL_CONFIG.depth;
      
      let text = '';
      let isGoal = false;

      if (!inGoalArea) {
        if (Math.abs(target.x) > GOAL_CONFIG.width / 2) text = 'WIDE!';
        else if (target.y > GOAL_CONFIG.height) text = 'OVER!';
        else if (target.z > 200) text = 'SHORT!';
        else text = 'MISS!';
        isGoal = false;
      } else {
        const dive = gkDiveFieldRef.current;
        if (dive && keeperSaves({ x: target.x, y: target.y }, dive)) {
          text = 'SAVED!';
          isGoal = false;
        } else {
          text = 'GOAL!';
          isGoal = true;
        }
      }

      setResult(text);
      setShotHistory(prev => [...prev, { 
        id: Date.now(), 
        target, 
        result: text, 
        isGoal, 
        timestamp: new Date() 
      }]);

      if (isGoal) {
        setStats(prev => ({
          goals: prev.goals + 1,
          streak: prev.streak + 1,
          shots: prev.shots + 1,
          best: Math.max(prev.best, prev.streak + 1)
        }));
      } else {
        setStats(prev => ({ ...prev, streak: 0, shots: prev.shots + 1 }));
        // Decrease attempts for saves/misses
        setAttemptsLeft(prev => {
          const newAttempts = prev - 1;
          if (newAttempts <= 0) {
            setGameOver(true);
            return 0;
          }
          return newAttempts;
        });
      }

      setGameState('scoring');
      if (!gameOver) {
        resetGame();
      }
    }, GK.decideMs);
  }, [gameOver, resetGame]);

  // Keeper save logic
  const keeperSaves = (target: { x: number; y: number }, dive: { x: number; y: number }) => {
    const dx = target.x - dive.x;
    const dy = target.y - dive.y;

    // Base, then jitter
    const jitter = lerp(RNG.reachJitterMin, RNG.reachJitterMax, Math.random());
    const baseHx = GK.reachHx * jitter;
    const baseHy = GK.reachHy * jitter;

    // Height scaling for vertical half-axis: ground -> smaller reach
    const yFrac = clamp01(target.y / GOAL_CONFIG.height);
    const hy = baseHy * (GK.lowShotScaleMin + (1 - GK.lowShotScaleMin) * yFrac);
    const hx = baseHx;

    const val = (dx * dx) / (hx * hx) + (dy * dy) / (hy * hy);
    return val <= 1;
  };

  return {
    // State
    gameState,
    ballPosition,
    playerState,
    goalkeeperState,
    goalkeeperPosition,
    result,
    stats,
    shotHistory,
    shotTarget,
    gameOver,
    attemptsLeft,
    
    // Actions
    animateShot,
    handleRestart,
    resetGame,
    
    // Constants
    GOAL_CONFIG,
  };
}
