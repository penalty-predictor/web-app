"use client";
import { useState } from "react";
import CountryGrid from "@/components/CountryGrid";
import GoalViewport from "@/components/GoalViewport";
import PowerBars from "@/components/PowerBars";
// Removed ROUNDS import since we now have infinite penalties
import { gkPolicy, resolveShot } from "../lib/physics";
import type { GameState, ShotParams } from "../lib/types";
import { GOAL_W, GOAL_H, COUNTRY_JERSEY_COLORS } from "../lib/constants";

export default function Home() {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [mode, setMode] = useState<GameState["mode"]>("player");
  const [inputMode, setInputMode] = useState<GameState["inputMode"]>("direct");

  const [totalShots, setTotalShots] = useState(0);
  const [goals, setGoals] = useState(0);
  const [saves, setSaves] = useState(0);
  const [misses, setMisses] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastMsg, setLastMsg] = useState<string>("");
  const [countrySelected, setCountrySelected] = useState(false);
  const [currentShot, setCurrentShot] = useState<ShotParams | null>(null);
  const [shotHistory, setShotHistory] = useState<Array<{x: number, y: number, result: 'goal' | 'save' | 'miss'}>>([]);

  const resetGame = () => {
    setTotalShots(0);
    setGoals(0);
    setSaves(0);
    setMisses(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setLastMsg("");
    setCountrySelected(false);
    setSelectedTeam("");
    setShotHistory([]);
  };

  const shoot = (shot: ShotParams) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentShot(shot);

    // GK guesses based on target
    const gk = gkPolicy(shot.targetX, "normal");
    const { scored, saved, offTarget } = resolveShot(shot, gk);

    setTimeout(() => {
      let message = "";
      let result: 'goal' | 'save' | 'miss';
      
      if (offTarget) {
        setMisses(m => m + 1);
        setCurrentStreak(0);
        message = "Shot missed the target!";
        result = 'miss';
      } else if (scored) {
        setGoals(g => g + 1);
        setCurrentStreak(s => s + 1);
        setBestStreak(b => Math.max(b, currentStreak + 1));
        message = "GOAL! Great shot!";
        result = 'goal';
      } else if (saved) {
        setSaves(s => s + 1);
        setCurrentStreak(0);
        message = "Saved by the keeper!";
        result = 'save';
      } else {
        setMisses(m => m + 1);
        setCurrentStreak(0);
        message = "Shot missed the target!";
        result = 'miss';
      }

      setTotalShots(t => t + 1);
      setShotHistory(h => [...h, { x: shot.targetX, y: shot.targetY, result }]);
      setLastMsg(message);
      
      setIsAnimating(false);
    }, 1200);
  };

  const saveAttempt = (gkDiveX: number) => {
    if (isAnimating) return;
    setIsAnimating(true);

    // Generate incoming shot
    const incomingShot: ShotParams = {
      targetX: 1 + Math.random() * 5.32,
      targetY: 0.2 + Math.random() * 2.0,
      power: 0.7 + Math.random() * 0.25,
      curve: 0
    };

    setCurrentShot(incomingShot);

    const res = resolveShot(incomingShot, { 
      diveX: gkDiveX, 
      heightBias: 0.4 + Math.random() * 0.4, 
      committed: true 
    });

    setTimeout(() => {
      let message = "";
      let result: 'goal' | 'save' | 'miss';
      
      if (!res.scored && !res.offTarget) {
        setSaves(s => s + 1);
        setCurrentStreak(s => s + 1);
        setBestStreak(b => Math.max(b, currentStreak + 1));
        message = "Fantastic save!";
        result = 'save';
      } else if (res.scored) {
        setGoals(g => g + 1); // Goal conceded
        setCurrentStreak(0);
        message = "Goal conceded...";
        result = 'goal';
      } else {
        setMisses(m => m + 1);
        setCurrentStreak(s => s + 1);
        setBestStreak(b => Math.max(b, currentStreak + 1));
        message = "Shot missed! Lucky escape!";
        result = 'miss';
      }

      setTotalShots(t => t + 1);
      setShotHistory(h => [...h, { x: incomingShot.targetX, y: incomingShot.targetY, result }]);
      setLastMsg(message);
      
      setIsAnimating(false);
    }, 1000);
  };

  // Get the jersey color for the selected team
  const getJerseyColor = (team: string) => {
    return COUNTRY_JERSEY_COLORS[team] || "#8b5cf6"; // Default to purple if not found
  };

  // Function to determine if text should be black or white based on background color
  const getTextColor = (backgroundColor: string) => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance (brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If background is light (luminance > 0.5), use black text
    // If background is dark (luminance <= 0.5), use white text
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  // Show country selection screen first
  if (!countrySelected) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 shadow-2xl max-w-lg w-full mx-4 border border-purple-500">
          <h1 className="text-3xl font-bold text-center mb-8 text-purple-300">Choose Your Team</h1>
          <CountryGrid
            label="Select your team"
            value={selectedTeam}
            onChange={(country: string) => {
              setSelectedTeam(country);
              setCountrySelected(true);
            }}
          />
        </div>
      </main>
    );
  }

    return (
    <main className="min-h-screen bg-gray-900">
      {/* Header Section */}
      <div className="relative bg-gray-800 border-b border-purple-500">
        {/* Main Menu Button */}
        <button
          onClick={resetGame}
          className="absolute top-4 left-4 bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700 transition-colors z-10 border border-purple-400"
        >
          Main Menu
        </button>

        {/* Stats Bar */}
        <div className="pt-16 pb-4 px-4">
          <div className="max-w-7xl mx-auto">
            <div 
              className="rounded-lg px-6 py-2 flex items-center justify-center gap-6 font-bold shadow-lg"
              style={{ 
                backgroundColor: getJerseyColor(selectedTeam),
                color: getTextColor(getJerseyColor(selectedTeam))
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedTeam}</span>
              </div>
              <div className="text-sm flex gap-4">
                <span>Goals: {goals}</span>
                <span>Saves: {saves}</span>
                <span>Misses: {misses}</span>
              </div>
              <div className="text-sm">
                <span>Streak: {currentStreak}</span>
                <span className="ml-2">Best: {bestStreak}</span>
              </div>
            </div>
            
            {/* Mode Selector */}
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={() => setMode("player")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === "player" 
                    ? "bg-purple-600 text-white border border-purple-400" 
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                }`}
              >
                Player Mode
              </button>
              <button
                onClick={() => setMode("goalkeeper")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === "goalkeeper" 
                    ? "bg-purple-600 text-white border border-purple-400" 
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                }`}
              >
                Goalkeeper Mode
              </button>
            </div>
            
            {/* Input Mode Selector (only for Player Mode) */}
            {mode === "player" && (
              <div className="mt-2 flex justify-center gap-2">
                <button
                  onClick={() => setInputMode("powerbars")}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    inputMode === "powerbars" 
                      ? "bg-purple-600 text-white border border-purple-400" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                  }`}
                >
                  Power Bars
                </button>
                <button
                  onClick={() => setInputMode("direct")}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    inputMode === "direct" 
                      ? "bg-purple-600 text-white border border-purple-400" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                }`}
                >
                  Direct Click
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative bg-gray-900 min-h-[600px] flex items-center justify-center">
        <div className="w-full max-w-4xl px-4">
          <GoalViewport
            mode={mode}
            inputMode={inputMode}
            disabled={isAnimating}
            onDirectAimConfirm={shoot}
            onGoalkeeperSave={saveAttempt}
            isAnimating={isAnimating}
            lastShot={currentShot}
          />
        </div>

        {/* Power Bars - Bottom Right */}
        {mode === "player" && inputMode === "powerbars" && (
          <div className="absolute bottom-8 right-8 w-64">
            <PowerBars
              onComplete={shoot}
              disabled={isAnimating}
            />
          </div>
        )}

        {/* Game Status */}
        {lastMsg && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 text-white px-6 py-3 rounded-lg border border-purple-500 shadow-lg">
            <p className="text-center font-medium">{lastMsg}</p>
          </div>
        )}
      </div>

      {/* Shot Chart and Stats - Below Game Area */}
      {totalShots > 0 && (
        <div className="bg-gray-800 border-t-2 border-purple-500 p-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-bold text-center mb-4 text-purple-300">Session Statistics</h3>
            
            {mode === "player" ? (
              // Player Mode Statistics
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player Stats Summary */}
                <div className="bg-gray-700 rounded-lg p-4 shadow border border-gray-600">
                  <h4 className="font-semibold mb-3 text-purple-300">Shooting Performance</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                    <div>Total Shots: <span className="font-bold text-white">{totalShots}</span></div>
                    <div>Success Rate: <span className="font-bold text-white">{totalShots > 0 ? Math.round((goals / totalShots) * 100) : 0}%</span></div>
                    <div className="text-green-400">Goals: <span className="font-bold">{goals}</span></div>
                    <div className="text-red-400">Saved/Missed: <span className="font-bold">{saves + misses}</span></div>
                    <div className="text-purple-400">Current Streak: <span className="font-bold">{currentStreak}</span></div>
                    <div className="text-purple-300">Best Streak: <span className="font-bold">{bestStreak}</span></div>
                  </div>
                </div>

                {/* Player Shot Chart */}
                <div className="bg-gray-700 rounded-lg p-4 shadow border border-gray-600">
                  <h4 className="font-semibold mb-3 text-purple-300">Shot Chart (Last 20)</h4>
                  <div className="relative bg-gray-600 rounded aspect-[2.5/1] border-2 border-purple-500">
                    {/* Goal posts */}
                    <div className="absolute inset-x-0 top-0 h-full border-l-2 border-r-2 border-purple-400"></div>
                    
                    {/* Shot markers */}
                    {shotHistory.slice(-20).map((shot, index) => (
                      <div
                        key={index}
                        className={`absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${
                          shot.result === 'goal' ? 'bg-green-500' : 
                          shot.result === 'save' ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                        style={{
                          left: `${(shot.x / (GOAL_W + 1)) * 100}%`,
                          top: `${(shot.y / (GOAL_H + 1)) * 100}%`
                        }}
                        title={`Shot ${shotHistory.length - 20 + index + 1}: ${shot.result}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-center gap-4 text-xs text-gray-300">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Goal
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Saved
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Miss
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Goalkeeper Mode Statistics
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Goalkeeper Stats Summary */}
                <div className="bg-gray-700 rounded-lg p-4 shadow border border-gray-600">
                  <h4 className="font-semibold mb-3 text-purple-300">Goalkeeping Performance</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                    <div>Total Attempts: <span className="font-bold text-white">{totalShots}</span></div>
                    <div>Save Rate: <span className="font-bold text-white">{totalShots > 0 ? Math.round((saves / totalShots) * 100) : 0}%</span></div>
                    <div className="text-green-400">Saves: <span className="font-bold">{saves}</span></div>
                    <div className="text-red-400">Goals Conceded: <span className="font-bold">{goals}</span></div>
                    <div className="text-purple-400">Current Streak: <span className="font-bold">{currentStreak}</span></div>
                    <div className="text-purple-300">Best Streak: <span className="font-bold">{bestStreak}</span></div>
                  </div>
                </div>

                {/* Goalkeeper Save Chart */}
                <div className="bg-gray-700 rounded-lg p-4 shadow border border-gray-600">
                  <h4 className="font-semibold mb-3 text-purple-300">Save Chart (Last 20)</h4>
                  <div className="relative bg-gray-600 rounded aspect-[2.5/1] border-2 border-purple-500">
                    {/* Goal posts */}
                    <div className="absolute inset-x-0 top-0 h-full border-l-2 border-r-2 border-purple-400"></div>
                    
                    {/* Save markers */}
                    {shotHistory.slice(-20).map((shot, index) => (
                      <div
                        key={index}
                        className={`absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${
                          shot.result === 'save' ? 'bg-green-500' : 
                          shot.result === 'goal' ? 'bg-gray-400' : 'bg-red-500'
                        }`}
                        style={{
                          left: `${(shot.x / (GOAL_W + 1)) * 100}%`,
                          top: `${(shot.y / (GOAL_H + 1)) * 100}%`
                        }}
                        title={`Attempt ${shotHistory.length - 20 + index + 1}: ${shot.result}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-center gap-4 text-xs text-gray-300">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Save
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Goal Conceded
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Miss
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}