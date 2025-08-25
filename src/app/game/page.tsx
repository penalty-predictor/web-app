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
  const [ballPosition, setBallPosition] = useState({ x: 50, y: 15 });
  const [playerState, setPlayerState] = useState('ready');
  const [goalkeeperState, setGoalkeeperState] = useState('ready');
  const [goalkeeperPosition, setGoalkeeperPosition] = useState({ x: 50, diving: false });
  const [result, setResult] = useState('');
  const [stats, setStats] = useState({ goals: 0, streak: 0, shots: 0, best: 0 });
  const [shotTarget, setShotTarget] = useState(null);

  const resetGame = useCallback(() => {
    setTimeout(() => {
      setGameState('ready');
      setBallPosition({ x: 50, y: 15 });
      setPlayerState('ready');
      setGoalkeeperState('ready');
      setGoalkeeperPosition({ x: 50, diving: false });
      setResult('');
      setShotTarget(null);
    }, 2500);
  }, []);

  const isInGoalBounds = (clickX, clickY) => {
    // Goal boundaries (in percentages of the screen) - now on green field
    const goalLeft = 25;
    const goalRight = 75;
    const goalTop = 50; // Start at green field boundary
    const goalBottom = 75; // End within green field
    
    return clickX >= goalLeft && clickX <= goalRight && 
           clickY >= goalTop && clickY <= goalBottom;
  };

  const handleGameClick = (e) => {
    if (gameState !== 'ready') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Legal zone is now on top of green field (50% to 100% of screen height)
    // Goal boundaries adjusted to be on the green field
    const goalLeft = 25;
    const goalRight = 75;
    const goalTop = 50; // Start at green field boundary
    const goalBottom = 75; // End within green field
    
    const inBounds = clickX >= goalLeft && clickX <= goalRight && 
                     clickY >= goalTop && clickY <= goalBottom;
    
    if (!inBounds) {
      // Shot goes out of bounds - automatic miss
      animateShot(clickX, clickY, false, 'out-of-bounds');
      return;
    }

    // Valid shot within goal bounds
    setShotTarget({ x: clickX, y: clickY });
    animateShot(clickX, clickY, true, 'in-bounds');
  };

  const animateShot = (clickX, clickY, inBounds, shotType) => {
    setGameState('shooting');
    setPlayerState('shooting');

    // Goalkeeper makes a decision
    const goalkeeperMoves = ['left', 'center', 'right'];
    const gkMove = goalkeeperMoves[Math.floor(Math.random() * goalkeeperMoves.length)];
    
    setTimeout(() => {
      setPlayerState('follow-through');
      
      // Ball moves to exact click position
      setBallPosition({ x: clickX, y: clickY });
      
      // Goalkeeper dives based on shot position
      let gkTargetX = 50; // Center position
      if (inBounds) {
        if (clickX < 35) gkMove = 'left';
        else if (clickX > 65) gkMove = 'right';
        else gkMove = 'center';
        
        // Position goalkeeper based on dive
        if (gkMove === 'left') gkTargetX = 30;
        else if (gkMove === 'right') gkTargetX = 70;
      }
      
      setGoalkeeperState(`diving-${gkMove}`);
      setGoalkeeperPosition({ 
        x: gkTargetX, 
        diving: true,
        direction: gkMove
      });
      
    }, 300);

    setTimeout(() => {
      // Determine result
      let isGoal = false;
      let resultText = '';
      
      if (shotType === 'out-of-bounds') {
        resultText = 'MISS!';
        isGoal = false;
      } else if (inBounds) {
        // Check if goalkeeper can reach the ball
        const ballX = clickX;
        const gkReach = 25; // Goalkeeper reach radius
        
        let gkX = 50;
        if (gkMove === 'left') gkX = 30;
        else if (gkMove === 'right') gkX = 70;
        
        const distance = Math.abs(ballX - gkX);
        const canSave = distance <= gkReach;
        
        if (canSave) {
          // 70% chance of save if goalkeeper is in position
          const saveChance = Math.random() < 0.7;
          if (saveChance) {
            resultText = 'SAVED!';
            isGoal = false;
          } else {
            resultText = 'GOAL!';
            isGoal = true;
          }
        } else {
          resultText = 'GOAL!';
          isGoal = true;
        }
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
    }, 1000);
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
    <main className="min-h-screen bg-blue-900 relative overflow-hidden">
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
        className="h-screen pt-20 cursor-crosshair"
        onClick={handleGameClick}
      >
        {/* Green Field - positioned at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-green-500">
          {/* Ball */}
          <div 
            className="absolute w-10 h-10 bg-white rounded-full shadow-lg transition-all duration-1000 ease-out z-20"
            style={{
              left: `${ballPosition.x}%`,
              bottom: `${100 - ballPosition.y}%`,
              transform: 'translate(-50%, 50%)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}
          ></div>

          {/* Player */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-3/4 transition-all duration-300">
            <img 
              src={getPlayerImage()}
              alt="Player"
              className="w-64 h-64 object-contain"
              onError={(e) => {
                const target = e.target;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-64 h-64 bg-white rounded-full flex items-center justify-center">
                      <span class="text-green-700 font-bold text-2xl">P</span>
                    </div>
                  `;
                }
              }}
            />
          </div>
        </div>

        {/* Goal Frame */}
        <div className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 w-[36rem] h-64 pointer-events-none">
          <div className="absolute left-0 bottom-0 w-6 h-full bg-white"></div>
          <div className="absolute right-0 bottom-0 w-6 h-full bg-white"></div>
          <div className="absolute top-0 left-0 w-full h-6 bg-white"></div>
        </div>

        {/* Goalkeeper */}
        <div 
          className="absolute bottom-1/2 translate-y-12 transition-all duration-700 ease-out z-15"
          style={{
            left: `${goalkeeperPosition.x}%`,
            transform: `translateX(-50%) translateY(12px) ${
              goalkeeperState === 'diving-left' ? 'translateY(-16px) rotate(-45deg)' :
              goalkeeperState === 'diving-right' ? 'translateY(-16px) rotate(45deg)' :
              goalkeeperState === 'diving-center' ? 'translateY(8px)' : ''
            }`
          }}
        >
          <img 
            src={getGoalkeeperImage()}
            alt="Goalkeeper"
            className="w-48 h-48 object-contain"
            onError={(e) => {
              const target = e.target;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-48 h-48 bg-white rounded-full flex items-center justify-center">
                    <span class="text-blue-900 font-bold text-2xl">GK</span>
                  </div>
                `;
              }
            }}
          />
        </div>

        {/* Result Display */}
        {result && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className={`text-6xl font-bold px-8 py-4 rounded-lg ${
              result === 'GOAL!' ? 'text-green-400 bg-black bg-opacity-50' : 
              result === 'SAVED!' ? 'text-red-400 bg-black bg-opacity-50' :
              'text-yellow-400 bg-black bg-opacity-50'
            }`}>
              {result}
            </div>
          </div>
        )}

        {/* Instructions */}
        {gameState === 'ready' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center z-20">
            <p className="text-lg font-semibold bg-black bg-opacity-50 px-4 py-2 rounded-lg">
              Click inside the goal area to shoot!
            </p>
          </div>
        )}

        {/* Goal Area Boundary Visualization - now on green field */}
        {gameState === 'ready' && (
          <>
            {/* Valid shooting area (goal bounds) - positioned on green field */}
            <div className="absolute bottom-12 left-1/4 w-1/2 h-48 border-2 border-green-400 border-dashed opacity-50 pointer-events-none animate-pulse">
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-green-400 font-bold">GOAL AREA</div>
            </div>
            
            {/* Out of bounds areas on green field */}
            <div className="absolute bottom-12 left-0 w-1/4 h-48 border-2 border-red-400 border-dashed opacity-30 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-400 font-bold rotate-45">OUT</div>
            </div>
            <div className="absolute bottom-12 right-0 w-1/4 h-48 border-2 border-red-400 border-dashed opacity-30 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-400 font-bold -rotate-45">OUT</div>
            </div>
          </>
        )}

        {/* Shot Target Indicator */}
        {shotTarget && gameState !== 'ready' && (
          <div 
            className="absolute w-4 h-4 bg-yellow-400 rounded-full z-25 animate-ping"
            style={{
              left: `${shotTarget.x}%`,
              top: `${shotTarget.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          ></div>
        )}
      </div>
    </main>
  );
}