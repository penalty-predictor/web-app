import { Shot, copyShare, resultToOutcome, getCountryFlag } from '../utils/sharing';

interface GameOverOverlayProps {
  stats: {
    goals: number;
    shots: number;
  };
  shotHistory: Array<{
    id: number;
    target: { x: number; y: number; z: number };
    result: string;
    isGoal: boolean;
    timestamp: Date;
  }>;
  countryName: string;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function GameOverOverlay({ 
  stats, 
  shotHistory, 
  countryName, 
  onRestart, 
  onMainMenu 
}: GameOverOverlayProps) {
  
  const handleCopyResults = async () => {
    try {
      const shots: Shot[] = shotHistory.map(shot => ({
        outcome: resultToOutcome(shot.result, shot.isGoal)
      }));

      const countryFlag = getCountryFlag(countryName);
      
      await copyShare(shots, {
        countryFlag,
        sessionNumber: 1,
        totalSessions: 3
      });

      // Show success feedback
      alert('Results copied to clipboard! Share them on social media!');
    } catch (error) {
      console.error('Failed to copy results:', error);
      alert('Failed to copy results. Please try again.');
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-2xl mx-4 text-center">
        <h2 className="text-4xl font-bold text-red-400 mb-4">GAME OVER!</h2>
        <p className="text-white text-lg mb-6">
          You've used all 5 attempts!<br/>
          Final Score: {stats.goals} goals out of {stats.shots} shots
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleCopyResults}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
          >
            📋 Copy Results
          </button>
          <button
            onClick={onRestart}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
          >
            🎯 Play Again
          </button>
          <button
            onClick={onMainMenu}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
          >
            🏠 Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
