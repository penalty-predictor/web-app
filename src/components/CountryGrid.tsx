'use client';

import { countries } from '../lib/countries';
import { Country } from '../lib/types';

interface CountryGridProps {
  selectedCountry: string | null;
  onCountrySelect: (country: string) => void;
}

export const CountryGrid: React.FC<CountryGridProps> = ({ 
  selectedCountry, 
  onCountrySelect 
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-4 gap-4 md:gap-6 lg:gap-8">
        {countries.map((country) => (
          <button
            key={country.code}
            onClick={() => onCountrySelect(country.name)}
            className={`group flex flex-col items-center p-4 rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              selectedCountry === country.name
                ? 'bg-purple-600/20 ring-2 ring-purple-500'
                : 'hover:bg-white/10'
            }`}
          >
            <div className={`w-20 h-16 md:w-24 md:h-20 lg:w-32 lg:h-24 mb-3 rounded-lg overflow-hidden flex items-center justify-center transition-colors duration-300 ${
              selectedCountry === country.name
                ? 'bg-purple-600/30 ring-2 ring-purple-500'
                : 'bg-white/20 group-hover:bg-white/30'
            }`}>
              <img
                src={country.flag}
                alt={`${country.name} flag`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to country code in a styled container
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-red-500 rounded-lg">
                        <span class="text-white text-lg font-bold">${country.code}</span>
                      </div>
                    `;
                  }
                }}
              />
            </div>
            <span className={`text-sm md:text-base font-medium text-center transition-colors duration-300 ${
              selectedCountry === country.name
                ? 'text-purple-300'
                : 'text-white group-hover:text-purple-300'
            }`}>
              {country.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
