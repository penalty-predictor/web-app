'use client';

import { countries } from '../lib/countries';
import { Country } from '../lib/types';
import { useEffect, useRef } from 'react';

interface CountryGridProps {
  selectedCountry: string | null;
  onCountrySelect: (country: string) => void;
}

export const CountryGrid: React.FC<CountryGridProps> = ({ 
  selectedCountry, 
  onCountrySelect 
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const selectedIndex = countries.findIndex(c => c.name === selectedCountry);
  const cols = 4; // Number of columns in the grid

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gridRef.current) return;

      let newIndex = selectedIndex;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newIndex = Math.max(0, selectedIndex - cols);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newIndex = Math.min(countries.length - 1, selectedIndex + cols);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = Math.max(0, selectedIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newIndex = Math.min(countries.length - 1, selectedIndex + 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedCountry) {
            // Trigger the confirm action - this will be handled by the parent
            const confirmButton = document.querySelector('button[onclick*="handleConfirm"]') as HTMLButtonElement;
            if (confirmButton) confirmButton.click();
          }
          return;
        default:
          return;
      }

      if (newIndex !== selectedIndex && newIndex >= 0 && newIndex < countries.length) {
        onCountrySelect(countries[newIndex].name);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, selectedCountry, onCountrySelect]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Retro arcade title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2 pixel-text">
          SELECT YOUR TEAM
        </h2>
        <div className="w-64 h-1 bg-yellow-400 mx-auto mb-4"></div>
      </div>

      {/* Main grid container with retro styling */}
      <div 
        ref={gridRef}
        className="bg-black border-4 border-yellow-400 p-6 rounded-none shadow-[0_0_20px_rgba(255,255,0,0.3)]"
        tabIndex={-1}
      >
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {countries.map((country, index) => (
            <button
              key={country.code}
              onClick={() => onCountrySelect(country.name)}
              className={`
                group relative overflow-hidden transition-all duration-200
                ${selectedCountry === country.name
                  ? 'transform scale-105'
                  : 'hover:transform hover:scale-105'
                }
                focus:outline-none
                ${index === selectedIndex ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}
              `}
            >
              {/* Main card container */}
              <div className={`
                relative bg-gray-800 border-2 p-3 md:p-4
                ${selectedCountry === country.name
                  ? 'border-yellow-400 bg-yellow-900/20 shadow-[0_0_15px_rgba(255,255,0,0.5)]'
                  : 'border-gray-600 hover:border-yellow-300 hover:bg-gray-700'
                }
                transition-all duration-200
              `}>
                
                {/* Flag container with pixel art frame */}
                <div className={`
                  w-16 h-12 md:w-20 md:h-16 mb-3 mx-auto relative
                  ${selectedCountry === country.name
                    ? 'bg-yellow-400/20'
                    : 'bg-gray-700'
                  }
                  border-2 border-gray-500
                `}>
                  {/* Pixel art corner decorations */}
                  <div className="absolute top-0 left-0 w-2 h-2 bg-yellow-400"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 bg-yellow-400"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-400"></div>
                  
                  {/* Flag image */}
                  <img
                    src={country.flag}
                    alt={`${country.name} flag`}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      // Fallback to country code in a styled container
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-red-600">
                            <span class="text-white text-xs md:text-sm font-bold pixel-text">${country.code}</span>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>

                {/* Country name with retro styling */}
                <div className="text-center">
                  <span className={`
                    text-xs md:text-sm font-bold block
                    ${selectedCountry === country.name
                      ? 'text-yellow-400'
                      : 'text-white group-hover:text-yellow-300'
                    }
                    pixel-text
                    transition-colors duration-200
                  `}>
                    {country.name.toUpperCase()}
                  </span>
                  
                  {/* Country code */}
                  <span className={`
                    text-xs block mt-1
                    ${selectedCountry === country.name
                      ? 'text-yellow-300'
                      : 'text-gray-400 group-hover:text-gray-300'
                    }
                    pixel-text
                    transition-colors duration-200
                  `}>
                    {country.code}
                  </span>
                </div>

                {/* Selection indicator */}
                {selectedCountry === country.name && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-yellow-400 border-t-[12px] border-t-yellow-400 border-r-[12px] border-r-transparent border-b-[12px] border-b-transparent"></div>
                )}

                {/* Hover effect - scan lines */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Retro instructions */}
      <div className="text-center mt-6">
        <p className="text-yellow-300 text-sm md:text-base pixel-text">
          USE ARROW KEYS OR CLICK TO SELECT • PRESS ENTER TO CONFIRM
        </p>
      </div>
    </div>
  );
};
