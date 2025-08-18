export const GOAL_W = 7.32;     // meters
export const GOAL_H = 3.5;      // meters (increased for better proportions)
export const PENALTY_SPOT_M = 11;

export const ROUNDS = 5;

export const DIFFICULTY = {
  easy:   { gkReactionMs: 420, barSpeed: 1.0, aimWobble: 0.0 },
  normal: { gkReactionMs: 330, barSpeed: 1.2, aimWobble: 0.01 },
  hard:   { gkReactionMs: 260, barSpeed: 1.4, aimWobble: 0.02 },
} as const;

export const COUNTRIES_48 = [
  "Argentina","Australia","Belgium","Brazil","Canada","Croatia","Denmark","England",
  "France","Germany","Italy","Japan","Mexico","Morocco","Netherlands","Nigeria",
  "Portugal","Qatar","Saudi Arabia","South Korea","Spain","Sweden","Switzerland","USA",
  "Uruguay","Poland","Colombia","Ecuador","Chile","Peru","Ghana","Senegal",
  "Cameroon","Ivory Coast","Algeria","Tunisia","Ukraine","Wales","Scotland","Turkey",
  "Iran","Iraq","Greece","Czechia","Austria","China","TBD"
];

// Country jersey colors for dynamic theming
export const COUNTRY_JERSEY_COLORS: Record<string, string> = {
  "Argentina": "#43A1D5", // Light blue
  "Australia": "#FFCD00", // Gold
  "Belgium": "#E30613", // Red
  "Brazil": "#FFDC02", // Yellow
  "Canada": "#D7141A", // Red
  "Croatia": "#FFFFFF", // White
  "Denmark": "#C60C30", // Red
  "England": "#FFFFFF", // White
  "France": "#0055A4", // Blue
  "Germany": "#FFFFFF", // White
  "Italy": "#0033A0", // Blue
  "Japan": "#00008B", // Dark blue
  "Mexico": "#006847", // Green
  "Morocco": "#D71A28", // Red
  "Netherlands": "#FF4F00", // Orange
  "Nigeria": "#006A4E", // Green
  "Portugal": "#006600", // Green
  "Qatar": "#8A1538", // Maroon
  "Saudi Arabia": "#006C35", // Green
  "South Korea": "#E60026", // Red
  "Spain": "#C60B1E", // Red
  "Sweden": "#FFCD00", // Gold
  "Switzerland": "#FF0000", // Red
  "USA": "#FFFFFF", // White
  "Uruguay": "#5BC2E7", // Light blue
  "Poland": "#FFFFFF", // White
  "Colombia": "#FFDD00", // Yellow
  "Ecuador": "#FFD100", // Yellow
  "Chile": "#DA291C", // Red
  "Peru": "#FFFFFF", // White
  "Ghana": "#FFFFFF", // White
  "Senegal": "#018749", // Green
  "Cameroon": "#00843D", // Green
  "Ivory Coast": "#FF8200", // Orange
  "Algeria": "#FFFFFF", // White
  "Tunisia": "#E70013", // Red
  "Ukraine": "#FFD700", // Yellow
  "Wales": "#D30731", // Red
  "Scotland": "#000040", // Dark blue
  "Turkey": "#E30A17", // Red
  "Iran": "#FFFFFF", // White
  "Iraq": "#136A37", // Green
  "Greece": "#0D5EAF", // Blue
  "Czechia": "#D7141A", // Red
  "Austria": "#ED2939", // Red
  "China": "#FF0000", // Red
  "TBD": "#808080" // Gray
};