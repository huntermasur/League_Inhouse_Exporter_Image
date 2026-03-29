// Shared types between server and client.
// The client imports from here via path alias.

/** Maps position index (1–5) to its human-readable role name. */
export const POSITION_TO_ROLE = {
  1: "Top",
  2: "Jungle",
  3: "Mid",
  4: "Bot",
  5: "Support",
} as const;

export type Role = (typeof POSITION_TO_ROLE)[keyof typeof POSITION_TO_ROLE];

export interface Player {
  id: number;
  game_id: string;
  team: 1 | 2;
  /** 1=Top 2=Jungle 3=Mid 4=Bot 5=Support */
  position: 1 | 2 | 3 | 4 | 5;
  /** Human-readable role derived from position — not stored in DB. */
  role: Role;
  username: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
}

export interface Ban {
  id: number;
  game_id: string;
  team: 1 | 2;
  /** Maps to the player in that position: 1=Top … 5=Support */
  position: 1 | 2 | 3 | 4 | 5;
  champion: string;
}

export interface Game {
  id: string;
  created_at: string;
  winning_team: 1 | 2;
  image_filename: string | null;
}

export interface GameDetail extends Game {
  players: Player[];
  bans: Ban[];
}

// What Gemini parses out of the screenshot
export interface ParsedPlayer {
  team: 1 | 2;
  position: 1 | 2 | 3 | 4 | 5;
  username: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
}

export interface ParsedBan {
  team: 1 | 2;
  position: 1 | 2 | 3 | 4 | 5;
  champion: string;
}

export interface ParsedGame {
  winning_team: 1 | 2;
  players: ParsedPlayer[];
  bans: ParsedBan[];
}

// Aggregated stat shapes used by the dashboard
export interface PlayerGameStat {
  username: string;
  games_played: number;
  wins: number;
  win_pct: number;
}

export interface ChampionKdaStat {
  champion: string;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
}

export interface ChampionPickStat {
  champion: string;
  pick_count: number;
  pick_rate: number;
}

export interface ChampionBanStat {
  champion: string;
  ban_count: number;
  ban_rate: number;
}

// Combined per-champion stats (win rate + KDA) used by charts and tables
export interface ChampionStatSummary {
  champion: string;
  games_played: number;
  wins: number;
  losses: number;
  win_pct: number;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
  kda: number;
}

// Player stats extended with KDA, used by scatter plot and performance table
export interface PlayerStatSummary {
  username: string;
  games_played: number;
  wins: number;
  losses: number;
  win_pct: number;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
  kda: number;
}

// Average K/D/A aggregated by role, used by the radar chart
export interface RolePerformanceStat {
  role: string;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
}
