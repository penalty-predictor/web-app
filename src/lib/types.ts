// Types for the country selection interface
export interface Country {
  name: string;
  flag: string;
  code: string;
}

export interface GameState {
  selectedCountry: string | null;
  gamePhase: 'country-selection' | 'playing' | 'ended';
}
