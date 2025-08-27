interface ShotChartProps {
  shotHistory: Array<{
    id: number;
    target: { x: number; y: number; z: number };
    result: string;
    isGoal: boolean;
    timestamp: Date;
  }>;
  goalConfig: {
    width: number;
    height: number;
    depth: number;
  };
  targetToChartPosition: (target: { x: number; y: number; z: number }) => { x: number; y: number };
}

export function ShotChart({ shotHistory, goalConfig, targetToChartPosition }: ShotChartProps) {
  return (
    <div className="relative bg-gray-900 bg-opacity-95 border-t-2 border-gray-700 p-4 z-40 mt-16">
      <div className="max-w-[1152px] mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-sm">📊 SHOT CHART</h3>
          <div className="text-gray-300 text-sm">
            {shotHistory.length} shots • {shotHistory.filter(s => s.isGoal).length} goals
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative bg-green-800 border-2 border-white rounded" style={{ width: '240px', height: '96px' }}>
            <div className="absolute inset-0 border border-gray-400 opacity-30"></div>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white"></div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-white"></div>

            {shotHistory.slice(-20).map((shot) => {
              const halfWidth = goalConfig.width / 2;
              const inGoal = Math.abs(shot.target.x) <= halfWidth &&
                             shot.target.y >= 0 && shot.target.y <= goalConfig.height &&
                             shot.target.z <= goalConfig.depth;
              if (!inGoal) return null;
              const pos = targetToChartPosition(shot.target);
              return (
                <div
                  key={shot.id}
                  className={`absolute w-2 h-2 rounded-full border transform -translate-x-1/2 -translate-y-1/2 ${
                    shot.isGoal ? 'bg-green-400 border-green-600' : 'bg-red-400 border-red-600'
                  }`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  title={`${shot.result}`}
                />
              );
            })}

            <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-white text-xs">GOAL</div>
          </div>

          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 border border-green-600 rounded-full"></div>
                <span className="text-green-400 text-xs font-medium">GOAL</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-400 border border-red-600 rounded-full"></div>
                <span className="text-red-400 text-xs font-medium">SAVE</span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-gray-400 text-xs mr-1">RECENT:</span>
              {shotHistory.slice(-8).reverse().map((shot) => (
                <div
                  key={shot.id}
                  className={`w-1.5 h-4 rounded-sm ${
                    shot.isGoal ? 'bg-green-400'
                      : shot.result.includes('SAVE') ? 'bg-red-400'
                        : 'bg-yellow-400'
                  }`}
                  title={shot.result}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
