import db from "../db/database.js";
import type {
  Game,
  GameDetail,
  Player,
  Ban,
  PlayerGameStat,
  ChampionKdaStat,
  ChampionPickStat,
  ChampionBanStat,
} from "../types.js";

// ── Games ────────────────────────────────────────────────────────────────────

export function getAllGames(): Game[] {
  return db
    .prepare(
      "SELECT id, created_at, winning_team, image_filename FROM games ORDER BY created_at DESC",
    )
    .all() as Game[];
}

export function getGameById(id: string): GameDetail | undefined {
  const game = db
    .prepare(
      "SELECT id, created_at, winning_team, image_filename FROM games WHERE id = ?",
    )
    .get(id) as Game | undefined;
  if (!game) return undefined;

  const players = db
    .prepare("SELECT * FROM players WHERE game_id = ? ORDER BY team, position")
    .all(id) as Player[];

  const bans = db
    .prepare("SELECT * FROM bans WHERE game_id = ? ORDER BY team, position")
    .all(id) as Ban[];

  return { ...game, players, bans };
}

interface InsertGameInput {
  id: string;
  winning_team: 1 | 2;
  image_filename: string | null;
  players: Omit<Player, "id" | "game_id">[];
  bans: Omit<Ban, "id" | "game_id">[];
}

export function insertGame(input: InsertGameInput): void {
  const insertGameStmt = db.prepare(
    "INSERT INTO games (id, winning_team, image_filename) VALUES (?, ?, ?)",
  );

  const insertPlayerStmt = db.prepare(
    "INSERT INTO players (game_id, team, position, username, champion, kills, deaths, assists) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );

  const insertBanStmt = db.prepare(
    "INSERT INTO bans (game_id, team, position, champion) VALUES (?, ?, ?, ?)",
  );

  const run = db.transaction(() => {
    insertGameStmt.run(input.id, input.winning_team, input.image_filename);

    for (const p of input.players) {
      insertPlayerStmt.run(
        input.id,
        p.team,
        p.position,
        p.username,
        p.champion,
        p.kills,
        p.deaths,
        p.assists,
      );
    }

    for (const b of input.bans) {
      insertBanStmt.run(input.id, b.team, b.position, b.champion);
    }
  });

  run();
}

export function deleteGame(id: string): boolean {
  const result = db.prepare("DELETE FROM games WHERE id = ?").run(id);
  return result.changes > 0;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function getPlayerGameStats(): PlayerGameStat[] {
  return db
    .prepare(
      `
    SELECT
      p.username,
      COUNT(*)                                                        AS games_played,
      SUM(CASE WHEN g.winning_team = p.team THEN 1 ELSE 0 END)       AS wins,
      ROUND(
        100.0 * SUM(CASE WHEN g.winning_team = p.team THEN 1 ELSE 0 END) / COUNT(*),
        1
      )                                                                AS win_pct
    FROM players p
    JOIN games g ON g.id = p.game_id
    GROUP BY p.username
    ORDER BY games_played DESC
  `,
    )
    .all() as PlayerGameStat[];
}

export function getChampionKdaStats(): ChampionKdaStat[] {
  return db
    .prepare(
      `
    SELECT
      champion,
      ROUND(AVG(kills),   2) AS avg_kills,
      ROUND(AVG(deaths),  2) AS avg_deaths,
      ROUND(AVG(assists), 2) AS avg_assists
    FROM players
    GROUP BY champion
    ORDER BY champion
  `,
    )
    .all() as ChampionKdaStat[];
}

export function getChampionPickStats(): ChampionPickStat[] {
  return db
    .prepare(
      `
    SELECT champion, COUNT(*) AS pick_count
    FROM players
    GROUP BY champion
    ORDER BY champion
  `,
    )
    .all() as ChampionPickStat[];
}

export function getChampionBanStats(): ChampionBanStat[] {
  const totalGames = (
    db.prepare("SELECT COUNT(*) AS n FROM games").get() as { n: number }
  ).n;
  if (totalGames === 0) return [];

  return db
    .prepare(
      `
    SELECT
      champion,
      COUNT(*)                                AS ban_count,
      ROUND(100.0 * COUNT(*) / (? * 2), 1)   AS ban_rate
    FROM bans
    WHERE champion != 'Unknown'
    GROUP BY champion
    ORDER BY champion
  `,
    )
    .all(totalGames) as ChampionBanStat[];
}
