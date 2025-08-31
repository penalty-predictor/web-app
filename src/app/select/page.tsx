'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CountryGrid } from '../../components/CountryGrid';
import { HowToPlayModal } from '../../components/HowToPlayModal';

export default function SelectCountryPage() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
  };

  const handleConfirm = () => {
    if (selectedCountry) {
      router.push(`/game?country=${encodeURIComponent(selectedCountry)}`);
    }
  };

  // Show How To Play on first visit when selecting countries
  useEffect(() => {
    try {
      const force = searchParams.get('howto');
      if (force === '1') {
        setShowHowTo(true);
        return;
      }
      const seen = localStorage.getItem('pp_seen_howto');
      if (!seen) setShowHowTo(true);
    } catch {}
  }, [searchParams]);

  const handleCloseHowTo = () => {
    setShowHowTo(false);
    try { localStorage.setItem('pp_seen_howto', '1'); } catch {}
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Retro scan lines overlay */}
      <div className="absolute inset-0 scan-lines pointer-events-none"></div>
      
      {/* CRT flicker effect */}
      <div className="absolute inset-0 crt-flicker pointer-events-none"></div>

      <HowToPlayModal open={showHowTo} onClose={handleCloseHowTo} />

      {/* Retro arcade header */}
      <div className="text-center mb-8 relative z-10">
        <div className="bg-black border-4 border-yellow-400 p-6 mb-6 inline-block retro-glow">
          <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 pixel-text">
            PENALTY PREDICTOR
          </h1>
        </div>
        
        <div className="bg-black border-2 border-yellow-400 p-4 inline-block">
          <h2 className="text-2xl md:text-3xl font-bold text-white pixel-text">
            CHOOSE YOUR TEAM
          </h2>
        </div>
      </div>

      {/* Country grid container */}
      <div className="w-full max-w-6xl mb-12 relative z-10">
        <CountryGrid
          selectedCountry={selectedCountry}
          onCountrySelect={handleCountrySelect}
        />
      </div>

      {/* Retro arcade button */}
      <div className="text-center relative z-10">
        <button
          onClick={handleConfirm}
          disabled={!selectedCountry}
          className={`
            arcade-button relative px-12 py-6 font-bold text-xl transition-all duration-200
            ${selectedCountry
              ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_8px_0_rgba(0,0,0,0.8)] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)]'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-[0_4px_0_rgba(0,0,0,0.8)]'
            }
            pixel-text
            border-4 border-black
          `}
        >
          {selectedCountry ? 'START GAME' : 'SELECT TEAM'}
        </button>
        
        {selectedCountry && (
          <div className="mt-4">
            <p className="text-yellow-300 text-sm pixel-text">
              SELECTED: <span className="text-white">{selectedCountry.toUpperCase()}</span>
            </p>
          </div>
        )}
      </div>

      {/* Retro arcade footer */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <div className="bg-black border-2 border-yellow-400 p-3 inline-block">
          <p className="text-yellow-300 text-xs pixel-text">
            INSERT COIN • PRESS START • HIGH SCORE: 999999
          </p>
        </div>
      </div>
    </main>
  );
}


