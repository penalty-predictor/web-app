'use client';

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { countries } from '../../lib/countries';

type Rect = { left:number; right:number; top:number; bottom:number; width:number; height:number };
type LayoutPct = {
  innerLeftPct: number;
  innerTopPct: number;
  innerRightPct: number;
  innerBottomPct: number;
  innerWidthPct: number;
  innerHeightPct: number;
};

export default function GamePage() {
  const searchParams = useSearchParams();
  const selectedCountry = searchParams.get('country');
  useEffect(() => { if (!selectedCountry) window.location.href = '/'; }, [selectedCountry]);

  const countryName = selectedCountry || 'United States';
  const countryData = countries.find(c => c.name === countryName);

  // Physical goal units (used for keeper/ball geometry)
  const GOAL_CONFIG = { width: 500, height: 200, depth: 30 };

  // Keeper base tuning
  const GK = {
    baseReactionMs: 180,     // when the keeper starts the dive (mean)
    decideMs: 1200,          // when we finalize the result & show contact
    reachHx: 60,             // base ellipse half-axis (horizontal) in FIELD units
    reachHy: 42,             // base ellipse half-axis (vertical)   in FIELD units
    lowShotScaleMin: 0.55,   // vertical reach reduced near ground
    bodyRadius: 18,          // how far from keeper center to place the ball on contact
  };

  // Keeper randomness ONLY — ball target never changes
  const RNG = {
    keeperCorrectGuessP: 0.55, // chance the keeper dives to the correct third
    diveOffsetMax: 12,         // max random offset (FIELD) around chosen dive point
    reachJitterMin: 0.9,       // random scale per shot on reach ellipse
    reachJitterMax: 1.08,
    reactionJitterMs: 120,     // ±ms around baseReactionMs
  };

  // DOM
  const gameRef = useRef<HTMLDivElement>(null);
  const goalRef = useRef<HTMLDivElement>(null);

  // Layout (% of game container) so scroll doesn’t affect mapping
  const [layout, setLayout] = useState<LayoutPct | null>(null);

  // Match the visual post/crossbar thickness (w-4/h-4 => 16px)
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

    const toPctX = (px:number) => (px / game.width) * 100;
    const toPctY = (px:number) => (px / game.height) * 100;

    const innerLeftPct   = toPctX(inner.left - game.left);
    const innerRightPct  = toPctX(inner.right - game.left);
    const innerTopPct    = toPctY(inner.top - game.top);
    const innerBottomPct = toPctY(inner.bottom - game.top);
    const innerWidthPct  = innerRightPct - innerLeftPct;
    const innerHeightPct = innerBottomPct - innerTopPct;

    setLayout({ innerLeftPct, innerTopPct, innerRightPct, innerBottomPct, innerWidthPct, innerHeightPct });
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (gameRef.current) ro.observe(gameRef.current);
    if (goalRef.current) ro.observe(goalRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure]);

  // --- Game state ---
  const [gameState, setGameState] = useState<'ready' | 'aiming' | 'shooting' | 'scoring'>('ready');
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 85 }); // % within game
  const [playerState, setPlayerState] = useState<'ready' | 'shooting' | 'follow-through'>('ready');

  const [goalkeeperState, setGoalkeeperState] = useState<'ready' | 'diving-left' | 'diving-right'>('ready');
  const [goalkeeperPosition, setGoalkeeperPosition] = useState({ x: 50, y: 50, diving: false });

  // Keeper shot-local params (random each shot; do NOT affect ball target)
  const gkDiveFieldRef   = useRef<{ x:number; y:number } | null>(null);
  const gkDiveScreenRef  = useRef<{ x:number; y:number } | null>(null);
  const gkHxHyRef        = useRef<{ hx:number; hy:number } | null>(null); // jittered reach ellipse
  const gkReactionMsRef  = useRef<number>(GK.baseReactionMs);

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

  // Idle keeper placement once layout lands
  useEffect(() => {
    if (!layout) return;
    const idle = fieldToScreen(0, 0, 0);
    setGoalkeeperPosition({ x: idle.x, y: idle.y, diving: false });
  }, [layout?.innerLeftPct, layout?.innerBottomPct]);

  const resetGame = useCallback(() => {
    setTimeout(() => {
      setGameState('ready');
      setBallPosition({ x: 50, y: 85 });
      setPlayerState('ready');
      setGoalkeeperState('ready');
      if (layout) {
        const idle = fieldToScreen(0, 0, 0);
        setGoalkeeperPosition({ x: idle.x, y: idle.y, diving: false });
      } else {
        setGoalkeeperPosition({ x: 50, y: 50, diving: false });
      }
      setResult('');
      setShotTarget(null);

      // clear per-shot keeper params
      gkDiveFieldRef.current  = null;
      gkDiveScreenRef.current = null;
      gkHxHyRef.current       = null;
      gkReactionMsRef.current = GK.baseReactionMs;
    }, 2500);
  }, [layout]);

  // --- FIELD <-> SCREEN% (scroll-invariant) ---
  const fieldToScreen = (fieldX: number, fieldZ: number, fieldY: number = 0) => {
    if (!layout) return { x: 50, y: 85 };
    const L = layout;
    const halfW = GOAL_CONFIG.width / 2;

    let xPct: number, yPct: number;

    if (fieldZ <= GOAL_CONFIG.depth) {
      // Allow outside to show true wide/over
      const xNorm = (fieldX + halfW) / GOAL_CONFIG.width;
      const yNorm = fieldY / GOAL_CONFIG.height;
      xPct = L.innerLeftPct + xNorm * L.innerWidthPct;
      yPct = L.innerBottomPct - yNorm * L.innerHeightPct;
    } else {
      const depthRatio = Math.min(fieldZ / 100, 1);
      const centerXPct = L.innerLeftPct + L.innerWidthPct / 2;
      xPct = centerXPct + (fieldX / halfW) * (L.innerWidthPct / 2);
      yPct = L.innerBottomPct + depthRatio * (100 - L.innerBottomPct)
           - (fieldY / GOAL_CONFIG.height) * 2;
    }
    return { x: xPct, y: yPct };
  };

  const screenToField = (clientX: number, clientY: number) => {
    if (!layout || !gameRef.current) return { x: 0, y: 0, z: 0 };
    const L = layout;
    const game = gameRef.current.getBoundingClientRect();

    const clickXPct = ((clientX - game.left) / game.width) * 100;
    const clickYPct = ((clientY - game.top) / game.height) * 100;

    const withinX = clickXPct >= L.innerLeftPct && clickXPct <= L.innerRightPct;
    const withinY = clickYPct >= L.innerTopPct && clickYPct <= L.innerBottomPct;

    const halfW = GOAL_CONFIG.width / 2;

    if (withinX && withinY) {
      const xNorm = (clickXPct - L.innerLeftPct) / L.innerWidthPct;
      const yNorm = (L.innerBottomPct - clickYPct) / L.innerHeightPct;
      return { x: xNorm * GOAL_CONFIG.width - halfW, y: yNorm * GOAL_CONFIG.height, z: 0 };
    }

    if (withinY && !withinX) {
      // True wide (goal plane)
      const xNorm = (clickXPct - L.innerLeftPct) / L.innerWidthPct;
      const yNorm = (L.innerBottomPct - clickYPct) / L.innerHeightPct;
      return { x: xNorm * GOAL_CONFIG.width - halfW, y: yNorm * GOAL_CONFIG.height, z: 0 };
    }

    if (clickYPct > L.innerBottomPct) {
      // On the field in front
      const depth = (clickYPct - L.innerBottomPct) / (100 - L.innerBottomPct) * 100;
      const xNormAroundCenter =
        (clickXPct - (L.innerLeftPct + L.innerWidthPct / 2)) / (L.innerWidthPct / 2);
      return { x: xNormAroundCenter * halfW, y: 0, z: Math.max(0, Math.min(depth, 100)) };
    }

    // Above the crossbar (goal plane)
    const xNorm = (clickXPct - L.innerLeftPct) / L.innerWidthPct;
    const overYN = (L.innerTopPct - clickYPct) / L.innerHeightPct;
    return {
      x: xNorm * GOAL_CONFIG.width - halfW,
      y: GOAL_CONFIG.height + overYN * 50,
      z: 0,
    };
  };

  const isInGoal = (x:number, y:number, z:number) => {
    const halfW = GOAL_CONFIG.width / 2;
    return Math.abs(x) <= halfW && y >= 0 && y <= GOAL_CONFIG.height && z <= GOAL_CONFIG.depth;
  };

  // --- Input ---
  const handleGameClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'ready' || !layout) return;
    const target = screenToField(e.clientX, e.clientY); // exact, no dispersion
    animateShot(target);
  };

  // Keeper third centers
  const thirdCentersFieldX = () => {
    const half = GOAL_CONFIG.width / 2;
    return [-half * 0.66, 0, half * 0.66];
  };

  // Keeper save decision — ellipse with per-shot jitter + height scaling
  const keeperSaves = (target:{x:number;y:number}, dive:{x:number;y:number}) => {
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

    const val = (dx*dx)/(hx*hx) + (dy*dy)/(hy*hy);
    return val <= 1;
  };

  // Small body contact randomization (ball doesn’t always hit the same spot)
  const contactPoint = (dive:{x:number;y:number}, target:{x:number;y:number}) => {
    const dx = target.x - dive.x;
    const dy = target.y - dive.y;
    const dist = Math.hypot(dx, dy) || 1;
    const baseAngle = Math.atan2(dy, dx);
    const jitter = (Math.random() - 0.5) * (Math.PI / 10); // ±18°
    const a = baseAngle + jitter;
    return {
      x: dive.x + Math.cos(a) * Math.min(GK.bodyRadius, dist),
      y: dive.y + Math.sin(a) * Math.min(GK.bodyRadius, dist),
    };
  };

  // --- Shot / keeper logic ---
  const animateShot = (target: {x:number;y:number;z:number}) => {
    setGameState('shooting');
    setPlayerState('shooting');
    setShotTarget(target);

    // Ball trajectory (purely kinematic; same click => same target)
    const startPos = { x: 0, y: 0, z: 11 };
    const traj = calculateTrajectory(startPos, target);
    animateBallTrajectory(traj);

    // Keeper: choose third with probability, add dive jitter, random reaction
    const halfW = GOAL_CONFIG.width / 2;
    const thirdsThreshold = halfW * 0.6;
    const trueThird: 'left' | 'center' | 'right' =
      target.x < -thirdsThreshold ? 'left' :
      target.x >  thirdsThreshold ? 'right' : 'center';

    const correct = Math.random() < RNG.keeperCorrectGuessP;
    let plannedThird: 'left' | 'center' | 'right' = trueThird;
    if (!correct) {
      // choose one of the other two
      const options = (['left','center','right'] as const).filter(t => t !== trueThird);
      plannedThird = options[Math.floor(Math.random() * options.length)];
    }

    // When the player kicks
    setTimeout(() => setPlayerState('follow-through'), 200);

    // Keeper dives after (randomized) reaction time
    const reactionMs = GK.baseReactionMs + (Math.random() * 2 - 1) * RNG.reactionJitterMs;
    gkReactionMsRef.current = reactionMs;

    setTimeout(() => {
      const [leftC, centerC, rightC] = thirdCentersFieldX();
      const targetX = plannedThird === 'left' ? leftC : plannedThird === 'right' ? rightC : centerC;
      const targetY = GOAL_CONFIG.height * 0.45;

      // Dive jitter (doesn't change ball target, only keeper reach center)
      const jitterX = (Math.random() * 2 - 1) * RNG.diveOffsetMax;
      const jitterY = (Math.random() * 2 - 1) * RNG.diveOffsetMax * 0.6;

      const diveX = targetX + jitterX;
      const diveY = targetY + jitterY;

      const diveScreen = fieldToScreen(diveX, 0, diveY);

      gkDiveFieldRef.current  = { x: diveX, y: diveY };
      gkDiveScreenRef.current = { x: diveScreen.x, y: diveScreen.y };

      setGoalkeeperState(
        plannedThird === 'left' ? 'diving-left' :
        plannedThird === 'right' ? 'diving-right' : 'ready'
      );
      setGoalkeeperPosition({ x: diveScreen.x, y: diveScreen.y, diving: true });
    }, Math.max(0, reactionMs));

    // Decide the outcome
    setTimeout(() => {
      const inGoalArea = isInGoal(target.x, target.y, target.z);
      let text = '';
      let isGoal = false;

      if (!inGoalArea) {
        if (Math.abs(target.x) > halfW)         text = 'WIDE!';
        else if (target.y > GOAL_CONFIG.height) text = 'OVER!';
        else if (target.z > 200)                text = 'SHORT!';
        else                                    text = 'MISS!';
        isGoal = false;
      } else {
        const dive = gkDiveFieldRef.current;
        if (dive && keeperSaves({x:target.x,y:target.y}, dive)) {
          text = 'SAVED!';
          isGoal = false;

          // Visual contact point (ball meets keeper body); keeper stays put
          const contact = contactPoint(dive, {x:target.x,y:target.y});
          const contactScreen = fieldToScreen(contact.x, 0, contact.y);
          setBallPosition({ x: contactScreen.x, y: contactScreen.y });
        } else {
          text = 'GOAL!';
          isGoal = true;
        }
      }

      setResult(text);
      setShotHistory(prev => [...prev, { id: Date.now(), target, result: text, isGoal, timestamp: new Date() }]);

      if (isGoal) {
        setStats(prev => ({
          goals: prev.goals + 1,
          streak: prev.streak + 1,
          shots: prev.shots + 1,
          best: Math.max(prev.best, prev.streak + 1)
        }));
      } else {
        setStats(prev => ({ ...prev, streak: 0, shots: prev.shots + 1 }));
      }

      setGameState('scoring');
      resetGame();
    }, GK.decideMs);
  };

  // Physics for ball
  const calculateTrajectory = (start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }) => {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const dy = end.y - start.y;

    const distance = Math.sqrt(dx*dx + dz*dz);
    const timeOfFlight = Math.max(0.8, Math.min(1.2, distance / 15));
    const vx0 = dx / timeOfFlight;
    const vz0 = dz / timeOfFlight;
    const gravity = 9.81;
    const vy0 = (dy / timeOfFlight) + (0.5 * gravity * timeOfFlight);

    return { vx0, vy0, vz0, timeOfFlight, gravity, startTime: null as number | null };
  };

  const animateBallTrajectory = (trajectory: {
    vx0: number; vy0: number; vz0: number; timeOfFlight: number; gravity: number; startTime: number | null;
  }) => {
    const startPos = { x: 0, y: 0, z: 11 };
    let animationId: number | undefined;

    const animate = (t: number) => {
      if (!trajectory.startTime) trajectory.startTime = t;
      const elapsed = (t - trajectory.startTime) / 1000;
      const progress = elapsed / trajectory.timeOfFlight;

      if (progress <= 1) {
        const x = startPos.x + trajectory.vx0 * elapsed;
        const z = startPos.z + trajectory.vz0 * elapsed;
        const y = Math.max(0, startPos.y + trajectory.vy0 * elapsed - 0.5 * trajectory.gravity * elapsed * elapsed);
        const screenPos = fieldToScreen(x, z, y);
        setBallPosition(screenPos);
        animationId = requestAnimationFrame(animate);
      } else {
        const x = startPos.x + trajectory.vx0 * trajectory.timeOfFlight;
        const z = startPos.z + trajectory.vz0 * trajectory.timeOfFlight;
        const y = Math.max(0, startPos.y + trajectory.vy0 * trajectory.timeOfFlight - 0.5 * trajectory.gravity * trajectory.timeOfFlight * trajectory.timeOfFlight);
        const finalPos = fieldToScreen(x, z, y);
        setBallPosition(finalPos);
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

  const targetToChartPosition = (target: { x: number; y: number; z: number }) => {
    const halfWidth = GOAL_CONFIG.width / 2;
    const xPercent = ((target.x + halfWidth) / GOAL_CONFIG.width) * 100;
    const yPercent = ((GOAL_CONFIG.height - target.y) / GOAL_CONFIG.height) * 100;
    return { x: Math.max(0, Math.min(100, xPercent)), y: Math.max(0, Math.min(100, yPercent)) };
  };

  // --- UI ---
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-900 to-indigo-900 relative overflow-hidden">
      {/* Stats bar */}
      <div className="absolute top-4 left-4 right-4 bg-blue-600 p-4 shadow-lg rounded-lg max-w-[1152px] mx-auto z-10">
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
            <span className="bg-red-700 px-3 py-1 rounded">BEST {stats.best}</span>
          </div>
        </div>
      </div>

      {/* Game scene */}
      <div ref={gameRef} className="h-screen pt-20 cursor-crosshair relative" onClick={handleGameClick}>
        {/* Field */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2"
             style={{ background: 'linear-gradient(to top, #16a34a 0%, #22c55e 50%, #4ade80 100%)' }}>
          <div className="absolute bottom-0 left-1/2 w-px h-full bg-white opacity-30 transform -translate-x-1/2"></div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-32 border-2 border-white opacity-20"></div>
          <div className="absolute bottom-20 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2"></div>
        </div>

        {/* Goal (measured) */}
        <div
          ref={goalRef}
          className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
          style={{ bottom: '50%', width: `${GOAL_CONFIG.width}px`, height: `${GOAL_CONFIG.height}px` }}
        >
          <div className="absolute left-0 bottom-0 w-4 h-full bg-white"></div>
          <div className="absolute right-0 bottom-0 w-4 h-full bg-white"></div>
          <div className="absolute top-0 left-0 w-full h-4 bg-white"></div>

          <div className="absolute inset-4 opacity-25">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-blue-200" style={{ left: `${(i + 1) * 12.5}%` }} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-blue-200" style={{ top: `${(i + 1) * 16.67}%` }} />
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            background: 'radial-gradient(circle at 30% 30%, #ffffff, #e9e9e9)'
          }}
        >
          <div className="absolute inset-0 rounded-full border border-white/40"></div>
          <div className="absolute top-1 left-1 w-2 h-2 bg-white/90 rounded-full"></div>
        </div>

        {/* Player (50% larger) */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-all duration-300 z-10">
          <img
            src={getPlayerImage()}
            alt="Player"
            className="w-48 h-48 object-contain"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-48 h-48 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white">
                    <span class="text-white font-bold text-2xl">⚽</span>
                  </div>
                `;
              }
            }}
          />
        </div>

        {/* Goalkeeper (50% larger) */}
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
            className="w-36 h-36 object-contain"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-36 h-36 bg-yellow-500 rounded-full flex items-center justify-center border-4 border-black">
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
            <div className={`text-6xl font-bold px-8 py-4 rounded-lg shadow-2xl ${
              result === 'GOAL!' ? 'text-green-400 bg-black/70'
              : result.includes('SAVE') ? 'text-red-400 bg-black/70'
              : 'text-yellow-400 bg-black/70'}`}>
              {result}
            </div>
          </div>
        )}

        {/* Instructions */}
        {gameState === 'ready' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center z-20">
            <p className="text-lg font-semibold bg-black/70 text-white px-6 py-3 rounded-lg">
              🎯 Click anywhere to aim your penalty kick!<br/>
              <span className="text-sm opacity-80">Same click, different outcomes — depends on the keeper.</span>
            </p>
          </div>
        )}

        {/* Visual goal highlight */}
        {gameState === 'ready' && (
          <div
            className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none animate-pulse opacity-30"
            style={{
              bottom: '50%', width: `${GOAL_CONFIG.width}px`, height: `${GOAL_CONFIG.height}px`,
              border: '3px dashed #10b981'
            }}
          />
        )}

        {/* Shot target indicator */}
        {shotTarget && gameState !== 'ready' && (
          <div
            className="absolute w-4 h-4 border-2 border-yellow-400 rounded-full z-25"
            style={{
              left: `${fieldToScreen(shotTarget.x, shotTarget.z, shotTarget.y).x}%`,
              top: `${fieldToScreen(shotTarget.x, shotTarget.z, shotTarget.y).y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 0, 0.3)'
            }}
          />
        )}
      </div>

      {/* Shot chart (below fold) */}
      <div className="relative bg-gray-900 bg-opacity-95 border-t-2 border-gray-700 p-4 z-40 mt-16">
        <div className="max-w-[1152px] mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold text-sm">📊 SHOT CHART</h3>
            <div className="text-gray-300 text-sm">
              {shotHistory.length} shots • {shotHistory.filter(s => s.isGoal).length} goals
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative bg-green-800 border-2 border-white rounded" style={{ width: '240px', height: '96px' }}>
              <div className="absolute inset-0 border border-gray-400 opacity-30"></div>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-white"></div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-white"></div>

              {shotHistory.slice(-20).map((shot) => {
                const halfWidth = GOAL_CONFIG.width / 2;
                const inGoal = Math.abs(shot.target.x) <= halfWidth &&
                               shot.target.y >= 0 && shot.target.y <= GOAL_CONFIG.height &&
                               shot.target.z <= GOAL_CONFIG.depth;
                if (!inGoal) return null;
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

/* ---------- helpers ---------- */

function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }
function lerp(a:number,b:number,t:number){ return a + (b-a)*t; }
