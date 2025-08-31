'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Retro scan lines overlay */}
      <div className="absolute inset-0 scan-lines pointer-events-none"></div>
      
      {/* CRT flicker effect */}
      <div className="absolute inset-0 crt-flicker pointer-events-none"></div>

      {/* Main title with retro arcade styling */}
      <div className="text-center mb-12 relative z-10">
        <div className="bg-black border-4 border-yellow-400 p-8 mb-8 inline-block retro-glow">
          <h1 className="text-5xl md:text-7xl font-extrabold text-yellow-400 pixel-text">
            PENALTY PREDICTOR
          </h1>
        </div>
        
        <div className="bg-black border-2 border-yellow-400 p-6 inline-block">
          <p className="text-gray-300 text-lg md:text-xl pixel-text">
            SCORE AS MANY PENALTIES AS YOU CAN
          </p>
          <p className="text-yellow-300 text-sm md:text-base pixel-text mt-2">
            YOUR RUN ENDS AFTER 5 SAVES
          </p>
        </div>
      </div>

      {/* Retro arcade play button */}
      <div className="text-center relative z-10">
        <button
          onClick={() => router.push('/select?howto=1')}
          className="arcade-button relative px-16 py-8 font-bold text-2xl bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_12px_0_rgba(0,0,0,0.8)] hover:shadow-[0_8px_0_rgba(0,0,0,0.8)] transition-all duration-200 pixel-text border-4 border-black"
        >
          INSERT COIN
        </button>
        
        <div className="mt-6">
          <p className="text-yellow-300 text-sm pixel-text">
            PRESS START TO BEGIN
          </p>
        </div>
      </div>

      {/* Retro arcade footer */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <div className="bg-black border-2 border-yellow-400 p-3 inline-block">
          <p className="text-yellow-300 text-xs pixel-text">
            HIGH SCORE: 999999 • CREDITS: 1 • 2024 ARCADE EDITION
          </p>
        </div>
      </div>
    </main>
  );
}