"use client";
import { GOAL_W, GOAL_H } from "../lib/constants";
import type { InputMode, Mode, ShotParams } from "../lib/types";
import { useMemo, useRef, useState, useEffect } from "react";

type Props = {
  mode: Mode;
  inputMode: InputMode;
  onDirectAimConfirm: (shot: ShotParams) => void;
  onGoalkeeperSave?: (gkDiveX: number) => void;
  disabled?: boolean;
  isAnimating?: boolean;
  lastShot?: ShotParams | null;
};

export default function GoalViewport({ mode, inputMode, onDirectAimConfirm, onGoalkeeperSave, disabled, isAnimating, lastShot }: Props) {
  const [cursor, setCursor] = useState<{x:number,y:number}|null>(null);
  const [ballPosition, setBallPosition] = useState<{x: number, y: number} | null>(null);
  const [goalKeeperPosition, setGoalKeeperPosition] = useState<{x: number, diving: 'none' | 'left' | 'right'}>({x: GOAL_W/2, diving: 'none'});
  const [playerState, setPlayerState] = useState<'ready' | 'shooting' | 'follow-through'>('ready');
  const svgRef = useRef<SVGSVGElement>(null);

  // Expanded playable area: (0,0) is bottom-left, with extra space around the goal
  const PLAYABLE_MARGIN = 2; // meters of extra space around the goal
  const PLAYABLE_W = GOAL_W + (PLAYABLE_MARGIN * 2);
  const PLAYABLE_H = GOAL_H + (PLAYABLE_MARGIN * 2);
  
  // The goal area is now the black frame (expanded by 1m on each side)
  const VISUAL_GOAL_W = GOAL_W + 1;
  const VISUAL_GOAL_H = GOAL_H + 1;
  const viewBox = useMemo(() => `0 0 ${PLAYABLE_W} ${PLAYABLE_H}`, [PLAYABLE_W, PLAYABLE_H]);

  // Ball animation effect
  useEffect(() => {
    if (lastShot && isAnimating) {
      // Start ball from penalty spot (bottom center)
      const startX = GOAL_W / 2 + PLAYABLE_MARGIN;
      const startY = GOAL_H + 2 + PLAYABLE_MARGIN; // Below the goal
      const targetX = lastShot.targetX + PLAYABLE_MARGIN;
      // targetY is now in correct coordinate system (0=bottom, GOAL_H=top)
      const targetY = lastShot.targetY + PLAYABLE_MARGIN;

      // Set player to shooting state
      setPlayerState('shooting');
      
      // Animate ball to target
      setBallPosition({ x: startX, y: startY });
      
      // Calculate goalkeeper dive position to actually intercept the ball
      // Goalkeeper should dive to where the ball will be, not just left/right
      const gkDiveDelay = 200; // ms delay before goalkeeper starts diving
      
      // Goalkeeper dives to intercept the ball at its target
      // Add some realistic error in goalkeeper positioning
      const gkError = 0.3; // meters of error in goalkeeper's dive
      const gkDiveX = targetX + (Math.random() - 0.5) * gkError;
      
      // Determine dive direction based on target position
      let diveDirection: 'left' | 'right' = 'right';
      if (targetX < (GOAL_W / 2 + PLAYABLE_MARGIN) - 0.5) {
        diveDirection = 'left';
      } else if (targetX > (GOAL_W / 2 + PLAYABLE_MARGIN) + 0.5) {
        diveDirection = 'right';
      }

      const animationDuration = 800;
      const startTime = Date.now();
      let hasTriggeredFollowThrough = false;
      let hasStartedGkDive = false;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Parabolic trajectory - now with correct Y coordinates
        const currentX = startX + (targetX - startX) * progress;
        // Y goes from below goal (startY) to target Y, with parabolic arc
        const currentY = startY + (targetY - startY) * progress - Math.sin(progress * Math.PI) * 1.5;
        
        setBallPosition({ x: currentX, y: currentY });

        // Start goalkeeper dive after delay
        if (elapsed > gkDiveDelay && !hasStartedGkDive) {
          setGoalKeeperPosition({ 
            x: gkDiveX, 
            diving: diveDirection 
          });
          hasStartedGkDive = true;
        }

        // Change to follow-through at 40% of animation (immediately after kick)
        if (progress > 0.4 && !hasTriggeredFollowThrough) {
          setPlayerState('follow-through');
          hasTriggeredFollowThrough = true;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Reset after animation
          setTimeout(() => {
            setBallPosition(null);
            setGoalKeeperPosition({ x: GOAL_W/2, diving: 'none' });
            setPlayerState('ready');
          }, 500);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [lastShot, isAnimating]);
  
  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    
    const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * PLAYABLE_W;
    // Fix Y coordinate: Mouse up should be top of goal, mouse down should be bottom
    const y = ((e.clientY - rect.top) / rect.height) * PLAYABLE_H;
    
    if (mode === "player" && inputMode === "direct") {
      setCursor({ x: Math.max(0, Math.min(PLAYABLE_W, x)), y: Math.max(0, Math.min(PLAYABLE_H, y)) });
    } else if (mode === "goalkeeper") {
      setCursor({ x: Math.max(0, Math.min(PLAYABLE_W, x)), y: Math.max(0, Math.min(PLAYABLE_H, y)) });
    }
  };

  const confirm = () => {
    if (!cursor || disabled) return;
    
    if (mode === "player" && inputMode === "direct") {
      // Convert cursor coordinates back to goal space (subtract margin)
      // Don't clamp coordinates - let physics determine if it's out of bounds
      onDirectAimConfirm({ 
        targetX: cursor.x - PLAYABLE_MARGIN, 
        targetY: cursor.y - PLAYABLE_MARGIN, 
        power: 0.7, 
        curve: 0 
      });
    } else if (mode === "goalkeeper" && onGoalkeeperSave) {
      onGoalkeeperSave(cursor.x - PLAYABLE_MARGIN);
    }
  };

  const getGoalkeeperImage = () => {
    // Return image path based on state
    if (goalKeeperPosition.diving === 'left') {
      return '/goalkeeper-diving-left.png';
    } else if (goalKeeperPosition.diving === 'right') {
      return '/goalkeeper-diving-right.png';
    }
    return '/goalkeeper-ready.png';
  };

  const getPlayerImage = () => {
    // Return image path based on player state
    switch (playerState) {
      case 'shooting':
        return '/player-shooting.png';
      case 'follow-through':
        return '/player-follow-through.png';
      default:
        return '/player-ready.png';
    }
  };

  return (
    <div className="w-full aspect-[16/9] bg-gray-800 border border-purple-500 rounded-xl relative overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] cursor-pointer"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onClick={confirm}
      >
        {/* Dark Background - Expanded playable area */}
        <rect x={0} y={0} width={PLAYABLE_W} height={PLAYABLE_H} fill="#1f2937" />
        
        {/* Goal Area - Purple frame that defines the scoring area */}
        <rect
          x={PLAYABLE_MARGIN}
          y={PLAYABLE_MARGIN}
          width={VISUAL_GOAL_W}
          height={VISUAL_GOAL_H}
          fill="#ffffff"
          stroke="#8b5cf6"
          strokeWidth="0.15"
        />
        

        

        


        {/* Goalkeeper - Dynamic Image */}
        <g transform={`translate(${goalKeeperPosition.x - 1.2 + PLAYABLE_MARGIN}, ${GOAL_H*0.1 + PLAYABLE_MARGIN})`}>
          <image
            x={0}
            y={0}
            width={2.4}
            height={4.2}
            href={getGoalkeeperImage()}
            className="remove-white-bg"
            style={{
              transform: goalKeeperPosition.diving !== 'none' 
                ? `rotate(${goalKeeperPosition.diving === 'left' ? '-30deg' : '30deg'})` 
                : 'none',
              transformOrigin: 'center bottom',
              transition: 'transform 0.3s ease-out'
            }}
          />

        </g>

        {/* Ball Animation */}
        {ballPosition && (
          <circle
            cx={ballPosition.x}
            cy={ballPosition.y}
            r={0.1}
            fill="#ffffff"
            stroke="#000000"
            strokeWidth={0.02}
          />
        )}

        {/* Player (Shooter) - Bottom of field */}
        <g transform={`translate(${GOAL_W/2 + PLAYABLE_MARGIN}, ${GOAL_H + 1.5 + PLAYABLE_MARGIN})`}>
          <image
            x={-1.2}
            y={-4.2}
            width={2.4}
            height={4.2}
            href={getPlayerImage()}
            className="remove-white-bg"
          />

        </g>

        {/* Aim cursor */}
        {cursor && !disabled && (mode === "player" && inputMode === "direct" || mode === "goalkeeper") && (
          <g>
            <circle 
              cx={cursor.x} 
              cy={cursor.y} 
              r={0.12} 
              fill="none" 
              stroke={mode === "player" ? "#ef4444" : "#22c55e"} 
              strokeWidth={0.06}
            />
            <line 
              x1={cursor.x-0.3} 
              y1={cursor.y} 
              x2={cursor.x+0.3} 
              y2={cursor.y} 
              stroke={mode === "player" ? "#ef4444" : "#22c55e"} 
              strokeWidth={0.04}
            />
            <line 
              x1={cursor.x} 
              y1={cursor.y-0.3} 
              x2={cursor.x} 
              y2={cursor.y+0.3} 
              stroke={mode === "player" ? "#ef4444" : "#22c55e"} 
              strokeWidth={0.04}
            />
          </g>
        )}
      </svg>


      
      {/* Confirm button for goalkeeper mode */}
      {mode === "goalkeeper" && cursor && !disabled && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <button
            onClick={confirm}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium border border-purple-400"
          >
            CONFIRM DIVE
          </button>
        </div>
      )}
    </div>
  );
}