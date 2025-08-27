'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { countries } from '../../lib/countries';
import { useGameLogic } from '../../hooks/useGameLogic';
import { useCoordinateSystem } from '../../hooks/useCoordinateSystem';
import { GameOverOverlay } from '../../components/GameOverOverlay';
import { StatsBar } from '../../components/StatsBar';
import { ShotChart } from '../../components/ShotChart';

export default function GamePage() {
  const searchParams = useSearchParams();
  const selectedCountry = searchParams.get('country');
  useEffect(() => { if (!selectedCountry) window.location.href = '/'; }, [selectedCountry]);

  const countryName = selectedCountry || 'United States';
  const countryData = countries.find(c => c.name === countryName);

  // Use custom hooks
  const {
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
    animateShot,
    handleRestart,
    GOAL_CONFIG,
  } = useGameLogic();

  const {
    gameRef,
    goalRef,
    layout,
    fieldToScreen,
    screenToField,
    isInGoal,
    targetToChartPosition,
  } = useCoordinateSystem(GOAL_CONFIG);

  // Local animation state (page-controlled)
  const [ballPos, setBallPos] = useState<{ x: number; y: number }>({ x: 50, y: 85 });
  const [gkPos, setGkPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Initialize keeper idle position when layout ready
  useEffect(() => {
    if (layout) {
      const idle = fieldToScreen(0, 0, 0);
      setGkPos({ x: idle.x, y: idle.y });
    }
  }, [layout]);

  // Reset positions when returning to ready state
  useEffect(() => {
    if (gameState === 'ready') {
      setBallPos({ x: 50, y: 85 });
      if (layout) {
        const idle = fieldToScreen(0, 0, 0);
        setGkPos({ x: idle.x, y: idle.y });
      } else {
        setGkPos({ x: 50, y: 50 });
      }
    }
  }, [gameState, layout, fieldToScreen]);

  // Animate ball on each shot
  useEffect(() => {
    if (!shotTarget || gameState !== 'shooting') return;
    const start = { x: 0, y: 0, z: 11 };

    const dx = shotTarget.x - start.x;
    const dz = shotTarget.z - start.z;
    const dy = shotTarget.y - start.y;

    const distance = Math.sqrt(dx * dx + dz * dz);
    const timeOfFlight = Math.max(0.8, Math.min(1.2, distance / 15));
    const vx0 = dx / timeOfFlight;
    const vz0 = dz / timeOfFlight;
    const gravity = 9.81;
    const vy0 = dy / timeOfFlight + 0.5 * gravity * timeOfFlight;

    let raf: number | null = null;
    let startTime: number | null = null;

    const tick = (t: number) => {
      if (startTime === null) startTime = t;
      const elapsed = (t - startTime) / 1000;
      const progress = elapsed / timeOfFlight;
      if (progress <= 1) {
        const x = start.x + vx0 * elapsed;
        const z = start.z + vz0 * elapsed;
        const y = Math.max(0, start.y + vy0 * elapsed - 0.5 * gravity * elapsed * elapsed);
        const sp = fieldToScreen(x, z, y);
        setBallPos({ x: sp.x, y: sp.y });
        raf = requestAnimationFrame(tick);
      } else {
        const x = start.x + vx0 * timeOfFlight;
        const z = start.z + vz0 * timeOfFlight;
        const y = Math.max(0, start.y + vy0 * timeOfFlight - 0.5 * gravity * timeOfFlight * timeOfFlight);
        const sp = fieldToScreen(x, z, y);
        setBallPos({ x: sp.x, y: sp.y });
      }
    };

    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [shotTarget, gameState, fieldToScreen]);

  // Move goalkeeper toward a dive point during shots
  useEffect(() => {
    if (!shotTarget || gameState !== 'shooting' || !layout) return;
    const halfW = GOAL_CONFIG.width / 2;
    const thirdsThreshold = halfW * 0.6;
    const leftC = -halfW * 0.66;
    const centerC = 0;
    const rightC = halfW * 0.66;
    const trueThird = shotTarget.x < -thirdsThreshold ? 'left' : shotTarget.x > thirdsThreshold ? 'right' : 'center';
    const targetXField = trueThird === 'left' ? leftC : trueThird === 'right' ? rightC : centerC;
    const targetYField = GOAL_CONFIG.height * 0.45;
    const diveScreen = fieldToScreen(targetXField, 0, targetYField);
    // Let CSS transition handle smooth movement
    setGkPos({ x: diveScreen.x, y: diveScreen.y });
  }, [shotTarget, gameState, layout, fieldToScreen, GOAL_CONFIG.width, GOAL_CONFIG.height]);

  // Go back to main menu
  const handleMainMenu = () => {
    window.location.href = '/';
  };

  // Handle game click
  const handleGameClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'ready' || !layout || gameOver) return;
    const target = screenToField(e.clientX, e.clientY);
    animateShot(target);
  };

  // Get player and goalkeeper images
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

  // --- UI ---
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-900 to-indigo-900 relative overflow-hidden">
      {/* Main Menu Button */}
      <button
        onClick={handleMainMenu}
        className="absolute top-2 left-2 z-20 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg shadow-lg transition-colors"
      >
        🏠 MAIN MENU
      </button>

      {/* Stats Bar */}
      <StatsBar
        countryName={countryName}
        countryFlag={countryData?.flag || ''}
        stats={stats}
        attemptsLeft={attemptsLeft}
      />

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
            left: `${ballPos.x}%`,
            top: `${ballPos.y}%`,
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
            left: `${gkPos.x}%`,
            top: `${gkPos.y}%`,
            transform: `translate(-50%, -50%) ${gkPos.x < 50 ? 'rotate(-12deg)' : gkPos.x > 50 ? 'rotate(12deg)' : ''}`,
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

        {/* Game Over Overlay */}
        {gameOver && (
          <GameOverOverlay
            stats={stats}
            shotHistory={shotHistory}
            countryName={countryName}
            onRestart={handleRestart}
            onMainMenu={handleMainMenu}
          />
        )}

        {/* Instructions */}
        {gameState === 'ready' && !gameOver && (
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

      {/* Shot Chart */}
      <ShotChart
        shotHistory={shotHistory}
        goalConfig={GOAL_CONFIG}
        targetToChartPosition={targetToChartPosition}
      />
    </main>
  );
}
