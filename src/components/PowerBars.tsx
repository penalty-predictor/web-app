"use client";
import { useEffect, useRef, useState } from "react";
import type { ShotParams } from "../lib/types";
import { GOAL_W, GOAL_H } from "../lib/constants";

type Props = {
  speed?: number;           // bar speed multiplier
  onComplete: (s: ShotParams) => void;
  disabled?: boolean;
};

export default function PowerBars({ speed=1.2, onComplete, disabled }: Props) {
  const [phase, setPhase] = useState<"power"|"direction"|"height"|"done">("power");
  const [t, setT] = useState(0); // 0..1 ping-pong
  const raf = useRef<number>(0);
  const vals = useRef<{power:number,dir:number,height:number}>({power:0.7,dir:0.5,height:0.6});

  useEffect(() => {
    if (disabled) return;
    
    const loop = () => {
      setT(prev => {
        let n = prev + 0.015 * speed;
        if (n >= 2) n -= 2;
        return n;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [speed, disabled]);

  const cursor = t <= 1 ? t : 2 - t; // ping-pong 0..1..0

  const lock = () => {
    if (disabled) return;
    if (phase === "power") {
      vals.current.power = 0.2 + 0.8 * cursor;
      setPhase("direction");
    } else if (phase === "direction") {
      vals.current.dir = cursor;      // 0..1 → left..right
      setPhase("height");
    } else if (phase === "height") {
      vals.current.height = cursor;   // 0..1 → low..high
      setPhase("done");
      onComplete({
        power: vals.current.power,
        targetX: vals.current.dir * GOAL_W,
        targetY: vals.current.height * GOAL_H,
        curve: 0
      });
      // reset next time
      setTimeout(()=>{ setPhase("power"); }, 100);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        lock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, disabled]);

  const Bar = ({label, active, locked, lockedValue}:{label:string, active:boolean, locked?:boolean, lockedValue?:number}) => (
    <div className="w-full h-10 bg-gray-700 rounded-lg relative overflow-hidden border border-gray-600">
      {/* Locked position indicator */}
      {locked && lockedValue !== undefined && (
        <div
          className="absolute inset-y-0 w-3 bg-purple-500 border-2 border-purple-600 rounded"
          style={{ left: `${lockedValue*100}%`, transform: "translateX(-50%)" }}
        />
      )}
      {/* Moving cursor */}
      {!locked && (
        <div
          className={`absolute inset-y-0 w-2 transition-colors ${
            active ? "bg-purple-400 shadow-md" : "bg-gray-500"
          }`}
          style={{ left: `${cursor*100}%`, transform: "translateX(-50%)" }}
        />
      )}
      <span className="absolute inset-y-0 left-3 text-sm font-medium flex items-center text-gray-300">
        {label}
      </span>
      {active && !locked && (
        <div className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-purple-400">
          ACTIVE
        </div>
      )}
      {locked && (
        <div className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-purple-400">
          LOCKED
        </div>
      )}
    </div>
  );

  const getButtonText = () => {
    switch(phase) {
      case "power": return "Lock Power";
      case "direction": return "Lock Direction";
      case "height": return "SHOOT!";
      default: return "Ready";
    }
  };

  return (
    <div className="flex flex-col gap-3 select-none">
      <Bar 
        label="Power" 
        active={phase === "power"} 
        locked={phase !== "power" && phase !== "done"}
        lockedValue={phase !== "power" && phase !== "done" ? vals.current.power : undefined}
      />
      <Bar 
        label="Direction" 
        active={phase === "direction"}
        locked={phase === "height" || phase === "done"}
        lockedValue={phase === "height" || phase === "done" ? vals.current.dir : undefined}
      />
      <Bar 
        label="Height" 
        active={phase === "height"}
        locked={phase === "done"}
        lockedValue={phase === "done" ? vals.current.height : undefined}
      />
      
      <button
        onClick={lock}
        className={`mt-2 px-4 py-3 rounded-lg font-semibold text-white transition-colors ${
          disabled 
            ? "bg-gray-600 cursor-not-allowed border border-gray-500" 
            : phase === "height" 
              ? "bg-purple-600 hover:bg-purple-700 border border-purple-400" 
              : "bg-purple-600 hover:bg-purple-700 border border-purple-400"
        }`}
        disabled={disabled}
      >
        {getButtonText()}
      </button>
      
      <p className="text-xs text-purple-300 text-center">
        Press SPACE or ENTER to lock
      </p>
    </div>
  );
}