'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CountryGrid } from '../components/CountryGrid';

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const router = useRouter();

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
  };

  const handleConfirm = () => {
    if (selectedCountry) {
      router.push(`/game?country=${encodeURIComponent(selectedCountry)}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          Choose your Country
        </h1>
      </div>

      <div className="w-full max-w-6xl mb-12">
        <CountryGrid
          selectedCountry={selectedCountry}
          onCountrySelect={handleCountrySelect}
        />
      </div>

      <div className="text-center">
        <button
          onClick={handleConfirm}
          disabled={!selectedCountry}
          className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 ${
            selectedCountry
              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          Confirm
        </button>
      </div>
    </main>
  );
}