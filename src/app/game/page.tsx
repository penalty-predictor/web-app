'use client';

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { countries } from '../../lib/countries';

type Rect = { left:number; right:number; top:number; bottom:number; width:number; height:number };

export default function GamePage() {
  const searchParams = useSearchParams();
  const selectedCountry = searchParams.get('country');

  useEffect(() => { if (!selectedCountry) window.location.href = '/'; }, [selectedCountry]);

  const countryName = selectedCountry || 'United States';
  const countryData = countries.find(c => c.name === countryName);

  // Visual goal (CSS px) used for BOTH visuals & physics
  const GOAL_CONFIG = { width: 500, height: 200, depth: 30 };

  // Keeper tuning
  const GK = {
    reactionMs: 180,         // when the dive begins
    decideMs: 1200,          // when result is decided
    baseSaveProb: 0.55,      // baseline save chance when guessing correct third
    snapToBallMs: 140,       // snap time window (visual only; we just update positions)
    gloveYOffsetPct: -2,     // cosmetic offset to put glove on the ball (screen %)
  };

  // --- DOM refs + measured layout (visual == physics) -------------------------
  const gameRef = useRef<HTMLDivElement>(null);
  const goalRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ game?: Rect; goal?: Rect; inner?: Rect }>({});

  // Must match Tailwind post/crossbar thickness (w-4/h-4 => 16px)
  const POST_THICKNESS_PX = 16;
  const CROSSBAR_THICKNESS_PX = 16;

  const measure = useCallback(() => {
    if (!gameRef.current || !goalRef.current) return;
    const game = gameRef.current.getBoundingClientRect();
    const goal = goalRef.current.getBoundingClientRect();
    const inner: Rect = {
      left: goal.left + POST_THICKNESS_PX,
      right: goal.right - POST_THICKNESS_PX,
      top: goal.top + CROSSBAR_THICKNESS_PX,
      bottom: goal.bottom,
      width: goal.width - POST_THICKNESS_PX * 2,
      height: goal.height - CROSSBAR_THICKNESS_PX,
    };
    setLayout({ game, goal, inner });
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (gameRef.current) ro.observe(gameRef.current);
    if (goalRef.current) ro.observe(goalRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure]);

  // --- Game state -------------------------------------------------------------
  const [gameState, setGameState] = useState<'ready' | 'aiming' | 'shooting' | 'scoring'>('ready');
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 85 }); // % within game box
  const [playerState, setPlayerState] = useState<'ready' | 'shooting' | 'follow-through'>('ready');

  // Keeper: x & y in screen %
  const [goalkeeperState, setGoalkeeperState] = useState<'ready' | 'diving-left' | 'diving-right'>('ready');
  const [goalkeeperPosition, setGoalkeeperPosition] = useState({ x: 50, y: 50, diving: false });

  const [result, setResult] = useState('');
  const [stats, setStats] = useState({ goals: 0, streak: 0, shots: 0, best: 0 });
  const [shotHistory, setShotHistory] = useState<Array<{
    id: number;
    target: { x: number; y: number; z: number };
    result: string;
    isGoal: boolean;
    timestamp: Date;
  }>>([]);
  const [shotTarget, setShotTarget] = useState<{ x: number; y: number; z: number } | null>(null);
  const [ballTrajectory, setBallTrajectory] = useState<{
    vx0: number; vy0: number; vz0: number;
    timeOfFlight: number; gravity: number; startTime: number | null;
  } | null>(null);

  // Place idle keeper centered on goal line when layout is ready
  useEffect(() => {
    if (!layout.game || !layout.inner) return;
    const idle = fieldToScreen(0, 0, 0);
    setGoalkeeperPosition({ x: idle.x, y: idle.y, diving: false });
  }, [layout.game, layout.inner]);

  const resetGame = useCallback(() => {
    setTimeout(() => {
      setGameState('ready');
      setBallPosition({ x: 50, y: 85 });
      setPlayerState('ready');
      setGoalkeeperState('ready');
      if (layout.game && layout.inner) {
        const idle = fieldToScreen(0, 0, 0);
        setGoalkeeperPosition({ x: idle.x, y: idle.y, diving: false });
      } else {
        setGoalkeeperPosition({ x: 50, y: 50, diving: false });
      }
      setResult('');
      setShotTarget(null);
      setBallTrajectory(null);
    }, 2500);
  }, [layout.game, layout.inner]);

  // --- Screen(px) -> Field (true inverse; no snapping) ------------------------
  const screenToField = (clientX: number, clientY: number) => {
    if (!layout.game || !layout.inner) return { x: 0, y: 0, z: 0 };
    const { game, inner } = layout;

    const halfWidth = GOAL_CONFIG.width / 2;
    const centerX = inner.left + inner.width / 2;

    const xNormAroundCenter = (clientX - centerX) / (inner.width / 2);
    const fieldX = xNormAroundCenter * halfWidth;

    if (clientY > inner.bottom) {
      const fieldDepth = (clientY - inner.bottom) / (game.bottom - inner.bottom);
      return { x: fieldX, y: 0, z: Math.min(fieldDepth * 100, 100) };
    }

    const yNorm = (inner.bottom - clientY) / inner.height;
    const fieldY = yNorm * GOAL_CONFIG.height;

    return { x: fieldX, y: fieldY, z: 0 };
  };

  // --- Field -> Screen(%) (renderer) -----------------------------------------
  const fieldToScreen = (fieldX: number, fieldZ: number, fieldY: number = 0) => {
    if (!layout.game || !layout.inner) return { x: 50, y: 85 };
    const { game, inner } = layout;
    const halfWidth = GOAL_CONFIG.width / 2;

    let pxX: number, pxY: number;

    if (fieldZ <= GOAL_CONFIG.depth) {
      const xNorm = (fieldX + halfWidth) / GOAL_CONFIG.width;
      const yNorm = fieldY / GOAL_CONFIG.height;
      pxX = inner.left + xNorm * inner.width;
      pxY = inner.bottom - yNorm * inner.height;
    } else {
      const depthRatio = Math.min(fieldZ / 100, 1);
      const centerX = inner.left + inner.width / 2;
      pxX = centerX + (fieldX / halfWidth) * (inner.width / 2);
      pxY = inner.bottom + depthRatio * (game.bottom - inner.bottom)
          - (fieldY / GOAL_CONFIG.height) * 20;
    }

    const xPercent = ((pxX - game.left) / game.width) * 100;
    const yPercent = ((pxY - game.top) / game.height) * 100;
    return { x: xPercent, y: yPercent };
  };

  // --- Goal detection (matches visual inner rectangle) -----------------------
  const isInGoal = (fieldX: number, fieldY: number, fieldZ: number) => {
    const halfWidth = GOAL_CONFIG.width / 2;
    const withinWidth  = Math.abs(fieldX) <= halfWidth;
    const withinHeight = fieldY >= 0 && fieldY <= GOAL_CONFIG.height;
    const atGoalLine   = fieldZ <= GOAL_CONFIG.depth;
    return withinWidth && withinHeight && atGoalLine;
  };

  // --- Input -----------------------------------------------------------------
  const handleGameClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'ready') return;
    if (!layout.game || !layout.inner) return;
    const target = screenToField(e.clientX, e.clientY);
    animateShot(target);
  };

  // --- Helpers for keeper thirds/targets -------------------------------------
  const thirdCentersFieldX = () => {
    const half = GOAL_CONFIG.width / 2;
    // centers of left/center/right thirds across the goal mouth
    return [-half * 0.66, 0, half * 0.66];
  };

  // Probability the keeper actually saves if he guessed the correct third
  const saveProbability = (targetX:number, targetY:number, gkMove:'left'|'center'|'right') => {
    const [leftC, centerC, rightC] = thirdCentersFieldX();
    const center = gkMove === 'left' ? leftC : gkMove === 'right' ? rightC : centerC;
    const half = GOAL_CONFIG.width / 2;
    const distNorm = Math.min(Math.abs(targetX - center) / (half / 3), 1); // 0 at third center, 1 at edge
    // Farther from guessed center -> lower chance; higher shots slightly harder
    const heightFactor = 0.95 - 0.25 * (targetY / GOAL_CONFIG.height); // 0.95 (low) .. 0.70 (top)
    const prob = GK.baseSaveProb * (1 - 0.7 * distNorm) * heightFactor;
    return Math.max(0.05, Math.min(prob, 0.9));
  };

  const keeperGuessedThird = (x:number, gkMove:'left'|'center'|'right') => {
    const half = GOAL_CONFIG.width / 2;
    const left = x < -half * 0.33;
    const right = x >  half * 0.33;
    const center = !left && !right;
    if (gkMove === 'left') return left;
    if (gkMove === 'right') return right;
    return center;
  };

  // --- Shot animation / physics + keeper contact WHEN saving -----------------
  const animateShot = (target: {x:number;y:number;z:number}) => {
    setGameState('shooting');
    setPlayerState('shooting');
    setShotTarget(target);

    const startPos = { x: 0, y: 0, z: 11 }; // Penalty spot
    const trajectory = calculateTrajectory(startPos, target);
    setBallTrajectory(trajectory);
    animateBallTrajectory(trajectory);

    // Keeper guess by thirds
    const halfWidth = GOAL_CONFIG.width / 2;
    const thirds = halfWidth * 0.6;
    let gkMove: 'left'|'center'|'right' = 'center';
    if (target.x < -thirds) gkMove = 'left';
    else if (target.x > thirds) gkMove = 'right';

    // Player follow-through
    setTimeout(() => setPlayerState('follow-through'), 200);

    // Keeper dives toward the **center of the guessed third** (not to the ball yet)
    setTimeout(() => {
      const [leftC, centerC, rightC] = thirdCentersFieldX();
      const diveFieldX = gkMove === 'left' ? leftC : gkMove === 'right' ? rightC : centerC;
      const diveFieldY = GOAL_CONFIG.height * 0.45; // mid-height glove
      const diveScreen = fieldToScreen(diveFieldX, 0, diveFieldY);
      setGoalkeeperState(gkMove === 'left' ? 'diving-left' : gkMove === 'right' ? 'diving-right' : 'ready');
      setGoalkeeperPosition({ x: diveScreen.x, y: diveScreen.y, diving: true });
    }, GK.reactionMs);

    // Decide outcome
    setTimeout(() => {
      const inGoalArea = isInGoal(target.x, target.y, target.z);
      let resultText = '';
      let isGoalScored = false;

      if (!inGoalArea) {
        if (Math.abs(target.x) > halfWidth)      resultText = 'WIDE!';
        else if (target.y > GOAL_CONFIG.height)  resultText = 'OVER!';
        else if (target.z > 200)                 resultText = 'SHORT!';
        else                                     resultText = 'MISS!';
        isGoalScored = false;
      } else {
        // Keeper only has a chance if he guessed the correct third
        const guessed = keeperGuessedThird(target.x, gkMove);
        const saved = guessed && Math.random() < saveProbability(target.x, target.y, gkMove);
        isGoalScored = !saved;
        resultText = isGoalScored ? 'GOAL!' : 'SAVED!';
      }

      if (!isGoalScored) {
        // VISUAL CONTACT ONLY WHEN SAVED:
        // snap keeper the last bit ONTO the ball and put the ball at the glove.
        const shotScreenTarget = fieldToScreen(target.x, target.z, target.y);
        const gloveY = shotScreenTarget.y + GK.gloveYOffsetPct;
        setGoalkeeperPosition({ x: shotScreenTarget.x, y: gloveY, diving: true });
        setBallPosition({ x: shotScreenTarget.x, y: gloveY });
      }

      setResult(resultText);

      setShotHistory(prev => [...prev, {
        id: Date.now(), target, result: resultText, isGoal: isGoalScored, timestamp: new Date(),
      }]);

      if (isGoalScored) {
        setStats(prev => ({
          goals: prev.goals + 1,
          streak: prev.streak + 1,
          shots: prev.shots + 1,
          best: Math.max(prev.best, prev.streak + 1),
        }));
      } else {
        setStats(prev => ({ ...prev, streak: 0, shots: prev.shots + 1 }));
      }

      setGameState('scoring');
      resetGame();
    }, GK.decideMs);
  };

  const calculateTrajectory = (start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }) => {
    const deltaX = end.x - start.x;
    const deltaZ = end.z - start.z;
    const deltaY = end.y - start.y;

    const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    const timeOfFlight = Math.max(0.8, Math.min(1.2, distance / 15));
    const vx0 = deltaX / timeOfFlight;
    const vz0 = deltaZ / timeOfFlight;
    const gravity = 9.81;
    const vy0 = (deltaY / timeOfFlight) + (0.5 * gravity * timeOfFlight);

    return { vx0, vy0, vz0, timeOfFlight, gravity, startTime: null as number | null };
  };

  const animateBallTrajectory = (trajectory: {
    vx0: number; vy0: number; vz0: number; timeOfFlight: number; gravity: number; startTime: number | null;
  }) => {
    const startPos = { x: 0, y: 0, z: 11 };
    let animationId: number | undefined;

    const animate = (currentTime: number) => {
      if (!trajectory.startTime) trajectory.startTime = currentTime;
      const elapsed = (currentTime - trajectory.startTime) / 1000;
      const progress = elapsed / trajectory.timeOfFlight;

      if (progress <= 1) {
        const currentX = startPos.x + trajectory.vx0 * elapsed;
        const currentZ = startPos.z + trajectory.vz0 * elapsed;
        const currentY = Math.max(0, startPos.y + trajectory.vy0 * elapsed - 0.5 * trajectory.gravity * elapsed * elapsed);
        const screenPos = fieldToScreen(currentX, currentZ, currentY);
        setBallPosition(screenPos);
        animationId = requestAnimationFrame(animate);
      } else {
        const finalX = startPos.x + trajectory.vx0 * trajectory.timeOfFlight;
        const finalZ = startPos.z + trajectory.vz0 * trajectory.timeOfFlight;
        const finalY = Math.max(0, startPos.y + trajectory.vy0 * trajectory.timeOfFlight - 0.5 * trajectory.gravity * trajectory.timeOfFlight * trajectory.timeOfFlight);
        const finalScreenPos = fieldToScreen(finalX, finalZ, finalY);
        setBallPosition(finalScreenPos);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  };

  const getPlayerImage = () => {
    switch (playerState) {
      case 'shooting': return '/player-shooting.png';
      case 'follow-through': return '/player-follow-through.png';
      default: return '/player-ready.png';
    }
  };

  const getGoalkeeperImage = () => {
    switch (goalkeeperState) {
      case 'diving-left': return '/goalkeeper-diving-left.png';
      case 'diving-right': return '/goalkeeper-diving-right.png';
      default: return '/goalkeeper-ready.png';
    }
  };

  const shotPercentage = stats.shots > 0 ? Math.round((stats.goals / stats.shots) * 100) : 0;

  // Mini chart mapping (goal-only)
  const targetToChartPosition = (target: { x: number; y: number; z: number }) => {
    const halfWidth = GOAL_CONFIG.width / 2;
    const xPercent = ((target.x + halfWidth) / GOAL_CONFIG.width) * 100;
    const yPercent = ((GOAL_CONFIG.height - target.y) / GOAL_CONFIG.height) * 100;
    return { x: Math.max(0, Math.min(100, xPercent)), y: Math.max(0, Math.min(100, yPercent)) };
  };

  // --- Render ----------------------------------------------------------------
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-200 relative overflow-hidden">
      {/* Red Stats Bar */}
      <div className="absolute top-4 left-4 right-4 bg-red-600 p-4 shadow-lg rounded-lg max-w-[1152px] mx-auto z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-6 rounded overflow-hidden bg-white">
              <img src={countryData?.flag} alt={`${countryName} flag`} className="w-full h-full object-contain" />
            </div>
            <span className="text-white font-bold text-lg">{countryName}</span>
          </div>
          <div className="flex items-center space-x-6 text-white font-medium">
            <span>GOALS {stats.goals}</span>
            <span>STREAK {stats.streak}</span>
            <span>SHOT % {shotPercentage}</span>
            <span className="bg-red-800 px-3 py-1 rounded">BEST {stats.best}</span>
          </div>
        </div>
      </div>

      {/* Game Scene */}
      <div ref={gameRef} className="h-screen pt-20 cursor-crosshair relative" onClick={handleGameClick}>
        {/* Field */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-green-600 to-green-400 transform-gpu"
          style={{ background: 'linear-gradient(to top, #16a34a 0%, #22c55e 50%, #4ade80 100%)' }}
        >
          <div className="absolute bottom-0 left-1/2 w-px h-full bg-white opacity-50 transform -translate-x-1/2"></div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-32 border-2 border-white opacity-30"></div>
          <div className="absolute bottom-20 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2"></div>
        </div>

        {/* Goal (measured) */}
        <div
          ref={goalRef}
          className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
          style={{ bottom: '50%', width: `${GOAL_CONFIG.width}px`, height: `${GOAL_CONFIG.height}px` }}
        >
          {/* Posts + Crossbar */}
          <div className="absolute left-0 bottom-0 w-4 h-full bg-white"></div>
          <div className="absolute right-0 bottom-0 w-4 h-full bg-white"></div>
          <div className="absolute top-0 left-0 w-full h-4 bg-white"></div>

          {/* Net */}
          <div className="absolute inset-4 opacity-30">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: `${(i + 1) * 12.5}%` }} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-gray-300" style={{ top: `${(i + 1) * 16.67}%` }} />
            ))}
          </div>
        </div>

        {/* Ball */}
        <div
          className="absolute w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-75 ease-linear z-20"
          style={{
            left: `${ballPosition.x}%`,
            top: `${ballPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            background: 'radial-gradient(circle at 30% 30%, #ffffff, #f0f0f0)',
          }}
        >
          <div className="absolute inset-0 rounded-full border border-gray-300 opacity-50"></div>
          <div className="absolute top-1 left-1 w-2 h-2 bg-white opacity-80 rounded-full"></div>
        </div>

        {/* Player */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-all duration-300 z-10">
          <img
            src={getPlayerImage()}
            alt="Player"
            className="w-32 h-32 object-contain"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white">
                    <span class="text-white font-bold text-xl">⚽</span>
                  </div>
                `;
              }
            }}
          />
        </div>

        {/* Goalkeeper (left/top in %) */}
        <div
          className="absolute transition-all duration-700 ease-out z-15"
          style={{
            left: `${goalkeeperPosition.x}%`,
            top: `${goalkeeperPosition.y}%`,
            transform: `translate(-50%, -50%) ${
              goalkeeperState === 'diving-left'
                ? 'rotate(-12deg)'
                : goalkeeperState === 'diving-right'
                ? 'rotate(12deg)'
                : ''
            }`,
          }}
        >
          <img
            src={getGoalkeeperImage()}
            alt="Goalkeeper"
            className="w-24 h-24 object-contain"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center border-4 border-black">
                    <span class="text-black font-bold text-lg">GK</span>
                  </div>
                `;
              }
            }}
          />
        </div>

        {/* Result */}
        {result && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div
              className={`text-6xl font-bold px-8 py-4 rounded-lg shadow-2xl ${
                result === 'GOAL!' ? 'text-green-400 bg-black bg-opacity-70'
              : result.includes('SAVE') ? 'text-red-400 bg-black bg-opacity-70'
              : 'text-yellow-400 bg-black bg-opacity-70'}`}
            >
              {result}
            </div>
          </div>
        )}

        {/* Instructions */}
        {gameState === 'ready' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center z-20">
            <p className="text-lg font-semibold bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg">
              🎯 Click anywhere to aim your penalty kick!<br />
              <span className="text-sm opacity-80">Higher = more height, corners = harder to save</span>
            </p>
          </div>
        )}

        {/* Goal area highlight */}
        {gameState === 'ready' && (
          <div
            className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none animate-pulse opacity-40"
            style={{
              bottom: '50%', width: `${GOAL_CONFIG.width}px`, height: `${GOAL_CONFIG.height}px`,
              border: '3px dashed #10b981',
            }}
          >
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-green-400 font-bold text-lg">
              ⚽ AIM HERE ⚽
            </div>
          </div>
        )}

        {/* Shot Target Indicator */}
        {shotTarget && gameState !== 'ready' && (
          <div
            className="absolute w-4 h-4 border-2 border-yellow-400 rounded-full z-25"
            style={{
              left: `${fieldToScreen(shotTarget.x, shotTarget.z, shotTarget.y).x}%`,
              top: `${fieldToScreen(shotTarget.x, shotTarget.z, shotTarget.y).y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 0, 0.3)',
            }}
          />
        )}
      </div>

      {/* Shot Chart */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 bg-opacity-95 border-t-2 border-gray-700 p-2 z-40">
        <div className="max-w-[1152px] mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold text-sm">📊 SHOT CHART</h3>
            <div className="text-gray-300 text-sm">
              {shotHistory.length} shots • {shotHistory.filter(s => s.isGoal).length} goals
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Mini goal */}
            <div className="relative bg-green-800 border-2 border-white rounded" style={{ width: '240px', height: '96px' }}>
              <div className="absolute inset-0 border border-gray-400 opacity-30"></div>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-white"></div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-white"></div>

              {shotHistory.slice(-20).map((shot) => {
                const shotInGoal = isInGoal(shot.target.x, shot.target.y, shot.target.z);
                if (!shotInGoal) return null;
                const pos = targetToChartPosition(shot.target);
                return (
                  <div
                    key={shot.id}
                    className={`absolute w-2 h-2 rounded-full border transform -translate-x-1/2 -translate-y-1/2 ${
                      shot.isGoal ? 'bg-green-400 border-green-600' : 'bg-red-400 border-red-600'
                    }`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    title={`${shot.result}`}
                  />
                );
              })}

              <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-white text-xs">GOAL</div>
            </div>

            {/* Legend + recent */}
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 border border-green-600 rounded-full"></div>
                  <span className="text-green-400 text-xs font-medium">GOAL</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 border border-red-600 rounded-full"></div>
                  <span className="text-red-400 text-xs font-medium">SAVE</span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-gray-400 text-xs mr-1">RECENT:</span>
                {shotHistory.slice(-8).reverse().map((shot) => (
                  <div
                    key={shot.id}
                    className={`w-1.5 h-4 rounded-sm ${
                      shot.isGoal ? 'bg-green-400'
                      : shot.result.includes('SAVE') ? 'bg-red-400'
                      : 'bg-yellow-400'
                    }`}
                    title={shot.result}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
