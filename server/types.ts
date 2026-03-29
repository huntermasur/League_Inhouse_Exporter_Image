// Shared types between server and client.
// The client imports from here via path alias.

export interface Player {
  id: number;
  game_id: string;
  team: 1 | 2;
  /** 1=Top 2=Jungle 3=Mid 4=Bot 5=Support */
  position: 1 | 2 | 3 | 4 | 5;
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
}

export interface ChampionBanStat {
  champion: string;
  ban_count: number;
  ban_rate: number;
}
