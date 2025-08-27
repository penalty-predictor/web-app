// Types
export type Outcome = "goal" | "save" | "miss";

export interface Shot {
  outcome: Outcome;
}

export interface ShareOpts {
  sessionNumber?: number;  // e.g., 1
  totalSessions?: number;  // default 3
  countryFlag?: string;    // e.g., "🇧🇷"
  gameName?: string;       // default "Penalty Predictor"
  width?: number;          // cells per row, default 5
}

// Emoji mapping
const EMOJI: Record<Outcome, string> = {
  goal: "🟩",
  save: "🧤", // signature emoji for saves
  miss: "🟥",
};

// Slice shots until 5 saves
function sliceUntilFiveSaves(shots: Shot[]): Shot[] {
  const out: Shot[] = [];
  let saves = 0;
  for (const s of shots) {
    out.push(s);
    if (s.outcome === "save" && ++saves >= 5) break;
  }
  return out;
}

// Build shareable text
export function buildShare(
  allShots: Shot[],
  opts: ShareOpts = {}
): string {
  const {
    gameName = "Penalty Predictor",
    sessionNumber = 1,
    totalSessions = 3,
    countryFlag,
    width = 5,
  } = opts;

  const shots = sliceUntilFiveSaves(allShots);

  // Header: ⚽ + Game + session + flag
  const header = `⚽ ${gameName} ${sessionNumber}/${totalSessions}${
    countryFlag ? " " + countryFlag : ""
  }`;

  // Grid
  const cells = shots.map(s => EMOJI[s.outcome]);
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += width) {
    rows.push(cells.slice(i, i + width).join(" "));
  }
  const grid = rows.join("\n");

  return [header, grid].join("\n");
}

// Copy to clipboard
export async function copyShare(
  shots: Shot[],
  opts: ShareOpts = {}
): Promise<void> {
  const text = buildShare(shots, opts);
  await navigator.clipboard.writeText(text);
}

// Convert game result to outcome
export function resultToOutcome(result: string, isGoal: boolean): Outcome {
  if (isGoal) return "goal";
  if (result.includes('SAVE')) return "save";
  return "miss";
}

// Country flag mapping
export function getCountryFlag(countryName: string): string {
  const flagMap: { [key: string]: string } = {
    'Argentina': '🇦🇷',
    'Brazil': '🇧🇷',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Italy': '🇮🇹',
    'Netherlands': '🇳🇱',
    'Portugal': '🇵🇹',
    'Spain': '🇪🇸',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Belgium': '🇧🇪',
    'Croatia': '🇭🇷',
    'Denmark': '🇩🇰',
    'Japan': '🇯🇵',
    'Mexico': '🇲🇽',
    'Morocco': '🇲🇦',
    'Poland': '🇵🇱',
    'Senegal': '🇸🇳',
    'South Korea': '🇰🇷',
    'Switzerland': '🇨🇭',
    'United States': '🇺🇸',
    'Uruguay': '🇺🇾',
    'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    'Jordan': '🇯🇴',
    'Ecuador': '🇪🇨',
    'New Zealand': '🇳🇿',
    'Canada': '🇨🇦',
    'Iran': '🇮🇷'
  };

  return flagMap[countryName] || '⚽';
}
