'use client';

import { useState, useEffect, useCallback } from 'react';

// Mock countries data
const countries = [
  { name: 'United States', flag: 'https://flagcdn.com/w320/us.png' }
];

export default function GamePage() {
  const selectedCountry = 'United States';
  const countryData = countries.find(c => c.name === selectedCountry);

  // Game state
  const [gameState, setGameState] = useState('ready');
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 85 }); // Start at penalty spot
  const [playerState, setPlayerState] = useState('ready');
  const [goalkeeperState, setGoalkeeperState] = useState('ready');
  const [goalkeeperPosition, setGoalkeeperPosition] = useState({ x: 50, diving: false });
  const [result, setResult] = useState('');
  const [stats, setStats] = useState({ goals: 0, streak: 0, shots: 0, best: 0 });
  const [shotTarget, setShotTarget] = useState(null);
  const [ballTrajectory, setBallTrajectory] = useState([]);

  const resetGame = useCallback(() => {
    setTimeout(() => {
      setGameState('ready');
      setBallPosition({ x: 50, y: 85 }); // Reset to penalty spot
      setPlayerState('ready');
      setGoalkeeperState('ready');
      setGoalkeeperPosition({ x: 50, diving: false });
      setResult('');
      setShotTarget(null);
      setBallTrajectory([]);
    }, 2500);
  }, []);

  // Convert screen coordinates to 3D field coordinates
  const screenToField = (screenX, screenY) => {
    // Goal is positioned at screen coordinates roughly 25% to 75% width, 25% to 52% height
    const goalScreenLeft = 25;  // Left goal post
    const goalScreenRight = 75; // Right goal post
    const goalScreenTop = 25;   // Top crossbar
    const goalScreenBottom = 52; // Goal line
    
    // Map screen coordinates to goal coordinates
    const goalX = ((screenX - 50) / 25) * 3.66; // -3.66 to +3.66 meters (half goal width)
    
    let goalY = 0;
    let goalZ = 0;
    
    if (screenY >= goalScreenTop && screenY <= goalScreenBottom) {
      // Click is in goal area
      goalY = ((goalScreenBottom - screenY) / (goalScreenBottom - goalScreenTop)) * 2.44; // 0 to 2.44m height
      goalZ = 0; // At goal line
    } else if (screenY > goalScreenBottom) {
      // Click is below goal (on field)
      const fieldDepth = ((screenY - goalScreenBottom) / (85 - goalScreenBottom)) * 11; // 0 to 11m from goal
      goalZ = Math.min(fieldDepth, 11);
      goalY = 0; // Ground level
    } else {
      // Click is above goal
      goalY = 2.44 + ((goalScreenTop - screenY) / goalScreenTop) * 2; // Above crossbar
      goalZ = 0;
    }
    
    return { x: goalX, y: Math.max(0, goalY), z: goalZ };
  };

  // Convert 3D field coordinates back to screen coordinates
  const fieldToScreen = (fieldX, fieldZ, fieldY = 0) => {
    // Goal area screen boundaries
    const goalScreenLeft = 25;
    const goalScreenRight = 75;
    const goalScreenTop = 25;
    const goalScreenBottom = 52;
    
    // Convert field X to screen X
    const screenX = 50 + (fieldX / 3.66) * 25;
    
    let screenY;
    if (fieldZ <= 0.5) {
      // Ball is at/near goal line
      if (fieldY <= 2.44) {
        // Ball is within goal height
        screenY = goalScreenBottom - (fieldY / 2.44) * (goalScreenBottom - goalScreenTop);
      } else {
        // Ball is above goal
        screenY = goalScreenTop - ((fieldY - 2.44) / 2) * goalScreenTop;
      }
    } else {
      // Ball is on field (moving toward goal)
      const depthRatio = Math.min(fieldZ / 11, 1);
      screenY = goalScreenBottom + depthRatio * (85 - goalScreenBottom);
      
      // Add height component for field shots
      screenY -= (fieldY / 5) * 20; // Reduce Y for height
    }
    
    return { x: screenX, y: screenY };
  };

  const isInGoal = (fieldX, fieldY, fieldZ) => {
    const goalHalfWidth = 3.66; // 7.32m / 2
    const goalHeight = 2.44;
    
    return Math.abs(fieldX) <= goalHalfWidth && 
           fieldY >= 0 && fieldY <= goalHeight && 
           fieldZ <= 1; // Allow some margin for goal line
  };

  const handleGameClick = (e) => {
    if (gameState !== 'ready') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Convert click to 3D target
    const target = screenToField(clickX, clickY);
    
    console.log('Click:', { screenX: clickX, screenY: clickY }, 'Target:', target);

    setShotTarget(target);
    animateShot(target);
  };

  const animateShot = (target) => {
    setGameState('shooting');
    setPlayerState('shooting');

    // Calculate trajectory points for realistic ball movement
    const startPos = { x: 0, y: 0, z: 11 }; // Penalty spot
    const trajectory = calculateTrajectory(startPos, target);
    setBallTrajectory(trajectory);

    // Goalkeeper decision
    const goalkeeperMoves = ['left', 'center', 'right'];
    let gkMove = 'center';
    
    if (target.x < -2) gkMove = 'left';
    else if (target.x > 2) gkMove = 'right';
    
    setTimeout(() => {
      setPlayerState('follow-through');
      
      // Start ball animation
      animateBallTrajectory(trajectory);
      
      // Goalkeeper reaction
      let gkTargetX = 50;
      if (gkMove === 'left') gkTargetX = 35;
      else if (gkMove === 'right') gkTargetX = 65;
      
      setGoalkeeperState(`diving-${gkMove}`);
      setGoalkeeperPosition({ 
        x: gkTargetX, 
        diving: true,
        direction: gkMove
      });
      
    }, 300);

    setTimeout(() => {
      // Determine result
      const isGoal = checkGoal(target, gkMove);
      let resultText = isGoal ? 'GOAL!' : 'SAVED!';
      
      // Check if shot was off target
      if (!isInGoal(target.x, target.y, target.z)) {
        if (Math.abs(target.x) > 3.66) resultText = 'WIDE!';
        else if (target.y > 2.44) resultText = 'OVER!';
        else if (target.z > 1) resultText = 'SHORT!';
        else resultText = 'MISS!';
      }
      
      setResult(resultText);
      
      // Update stats
      if (isGoal) {
        setStats(prev => ({
          goals: prev.goals + 1,
          streak: prev.streak + 1,
          shots: prev.shots + 1,
          best: Math.max(prev.best, prev.streak + 1)
        }));
      } else {
        setStats(prev => ({
          ...prev,
          streak: 0,
          shots: prev.shots + 1
        }));
      }
      
      setGameState('result');
      resetGame();
    }, 1200);
  };

  const calculateTrajectory = (start, end) => {
    const points = [];
    const steps = 25;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Linear interpolation for x and z
      const x = start.x + (end.x - start.x) * t;
      const z = start.z + (end.z - start.z) * t;
      
      // Parabolic trajectory for y (height)
      const y = start.y + (end.y - start.y) * t + 
                2 * Math.max(end.y, 1) * t * (1 - t); // Natural arc
      
      points.push({ x, y, z });
    }
    
    return points;
  };

  const animateBallTrajectory = (trajectory) => {
    trajectory.forEach((point, index) => {
      setTimeout(() => {
        const screenPos = fieldToScreen(point.x, point.z, point.y);
        setBallPosition(screenPos);
      }, index * 40);
    });
  };

  const checkGoal = (target, gkMove) => {
    if (!isInGoal(target.x, target.y, target.z)) return false;
    
    // Calculate goalkeeper reach
    const gkReach = 1.8; // Goalkeeper reach in meters
    let gkX = 0;
    if (gkMove === 'left') gkX = -1.5;
    else if (gkMove === 'right') gkX = 1.5;
    
    const distance = Math.sqrt(
      Math.pow(target.x - gkX, 2) + 
      Math.pow(target.y - 1, 2) // Goalkeeper hand height
    );
    
    if (distance <= gkReach) {
      return Math.random() < 0.3; // 30% chance to score even if keeper reaches
    }
    
    return true;
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-200 relative overflow-hidden">
      {/* Red Stats Bar */}
      <div className="absolute top-4 left-4 right-4 bg-red-600 p-4 shadow-lg rounded-lg max-w-[1152px] mx-auto z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-6 rounded overflow-hidden bg-white">
              <img 
                src={countryData?.flag} 
                alt={`${selectedCountry} flag`}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-white font-bold text-lg">{selectedCountry}</span>
          </div>
          <div className="flex items-center space-x-6 text-white font-medium">
            <span>GOALS {stats.goals}</span>
            <span>STREAK {stats.streak}</span>
            <span>SHOT % {shotPercentage}</span>
            <span className="bg-red-800 px-3 py-1 rounded">BEST {stats.best}</span>
          </div>
        </div>
      </div>

      {/* Game Scene Container */}
      <div 
        className="h-screen pt-20 cursor-crosshair relative"
        onClick={handleGameClick}
      >
        {/* Green Field with perspective */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-green-600 to-green-400 transform-gpu"
             style={{
               background: 'linear-gradient(to top, #16a34a 0%, #22c55e 50%, #4ade80 100%)'
             }}>
          
          {/* Field markings */}
          <div className="absolute bottom-0 left-1/2 w-px h-full bg-white opacity-50 transform -translate-x-1/2"></div>
          
          {/* Penalty area */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-32 border-2 border-white opacity-30"></div>
          
          {/* Penalty spot */}
          <div className="absolute bottom-20 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2"></div>
        </div>

        {/* Goal Structure - positioned correctly in 3D space */}
        <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
             style={{ 
               bottom: '50%', 
               width: '400px', 
               height: '160px'
             }}>
          {/* Goal posts and crossbar */}
          <div className="absolute left-0 bottom-0 w-4 h-full bg-white"></div>
          <div className="absolute right-0 bottom-0 w-4 h-full bg-white"></div>
          <div className="absolute top-0 left-0 w-full h-4 bg-white"></div>
          
          {/* Goal net pattern */}
          <div className="absolute inset-4 opacity-30">
            {Array.from({length: 8}).map((_, i) => (
              <div key={`v${i}`} 
                   className="absolute top-0 bottom-0 w-px bg-gray-300"
                   style={{left: `${(i + 1) * 12.5}%`}}></div>
            ))}
            {Array.from({length: 6}).map((_, i) => (
              <div key={`h${i}`} 
                   className="absolute left-0 right-0 h-px bg-gray-300"
                   style={{top: `${(i + 1) * 16.67}%`}}></div>
            ))}
          </div>
        </div>

        {/* Ball with 3D physics */}
        <div 
          className="absolute w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-75 ease-linear z-20"
          style={{
            left: `${ballPosition.x}%`,
            top: `${ballPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            background: 'radial-gradient(circle at 30% 30%, #ffffff, #f0f0f0)'
          }}
        >
          {/* Ball pattern */}
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
              const target = e.target;
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

        {/* Goalkeeper with 3D positioning */}
        <div 
          className="absolute transition-all duration-700 ease-out z-15"
          style={{
            left: `${goalkeeperPosition.x}%`,
            bottom: '50%',
            transform: `translateX(-50%) translateY(40px) ${
              goalkeeperState === 'diving-left' ? 'translateY(-20px) translateX(-30px) rotate(-15deg)' :
              goalkeeperState === 'diving-right' ? 'translateY(-20px) translateX(30px) rotate(15deg)' :
              goalkeeperState === 'diving-center' ? 'translateY(10px)' : ''
            }`
          }}
        >
          <img 
            src={getGoalkeeperImage()}
            alt="Goalkeeper"
            className="w-24 h-24 object-contain"
            onError={(e) => {
              const target = e.target;
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

        {/* Result Display */}
        {result && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className={`text-6xl font-bold px-8 py-4 rounded-lg shadow-2xl ${
              result === 'GOAL!' ? 'text-green-400 bg-black bg-opacity-70' : 
              result.includes('SAVE') ? 'text-red-400 bg-black bg-opacity-70' :
              'text-yellow-400 bg-black bg-opacity-70'
            }`}>
              {result}
            </div>
          </div>
        )}

        {/* Instructions */}
        {gameState === 'ready' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center z-20">
            <p className="text-lg font-semibold bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg">
              🎯 Click anywhere to aim your penalty kick!<br/>
              <span className="text-sm opacity-80">Higher = more height, corners = harder to save</span>
            </p>
          </div>
        )}

        {/* Goal area highlighting */}
        {gameState === 'ready' && (
          <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none animate-pulse opacity-40"
               style={{ 
                 bottom: '50%', 
                 width: '400px', 
                 height: '160px',
                 border: '3px dashed #10b981'
               }}>
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-green-400 font-bold text-lg">
              ⚽ AIM HERE ⚽
            </div>
          </div>
        )}

        {        /* Shot Target Indicator */}
        {shotTarget && gameState !== 'ready' && (
          <div 
            className="absolute w-4 h-4 border-2 border-yellow-400 rounded-full z-25"
            style={{
              left: `${fieldToScreen(shotTarget.x, shotTarget.z, shotTarget.y).x}%`,
              top: `${fieldToScreen(shotTarget.x, shotTarget.z, shotTarget.y).y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 0, 0.3)'
            }}
          ></div>
        )}
      </div>
    </main>
  );
}