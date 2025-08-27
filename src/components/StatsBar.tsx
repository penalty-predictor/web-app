interface StatsBarProps {
  countryName: string;
  countryFlag: string;
  stats: {
    goals: number;
    streak: number;
    shots: number;
    best: number;
  };
  attemptsLeft: number;
}

export function StatsBar({ countryName, countryFlag, stats, attemptsLeft }: StatsBarProps) {
  const shotPercentage = stats.shots > 0 ? Math.round((stats.goals / stats.shots) * 100) : 0;

  return (
    <div className="absolute top-4 left-4 right-4 bg-blue-600 p-4 shadow-lg rounded-lg max-w-[1152px] mx-auto z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-6 rounded overflow-hidden bg-white">
            <img src={countryFlag} alt={`${countryName} flag`} className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-bold text-lg">{countryName}</span>
        </div>
        <div className="flex items-center space-x-6 text-white font-medium">
          <span>GOALS {stats.goals}</span>
          <span>STREAK {stats.streak}</span>
          <span>SHOT % {shotPercentage}</span>
          <span className="bg-red-700 px-3 py-1 rounded">BEST {stats.best}</span>
          <span className={`px-3 py-1 rounded ${attemptsLeft <= 2 ? 'bg-red-600' : 'bg-blue-600'}`}>
            ATTEMPTS {attemptsLeft}
          </span>
        </div>
      </div>
    </div>
  );
}
