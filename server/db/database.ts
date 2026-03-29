import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "..", "data", "inhouse.db");

// Ensure the data directory exists at module load
import fs from "fs";
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id             TEXT PRIMARY KEY,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    winning_team   INTEGER NOT NULL CHECK (winning_team IN (1, 2)),
    image_filename TEXT
  );

  CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id     TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team        INTEGER NOT NULL CHECK (team IN (1, 2)),
    position    INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
    username    TEXT NOT NULL,
    champion    TEXT NOT NULL,
    kills       INTEGER NOT NULL DEFAULT 0,
    deaths      INTEGER NOT NULL DEFAULT 0,
    assists     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS bans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id     TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team        INTEGER NOT NULL CHECK (team IN (1, 2)),
    position    INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
    champion    TEXT NOT NULL
  );
`);

export default db;

// ── Migrations ────────────────────────────────────────────────────────────────
// Runs once at startup; safe to call against an already-migrated database.

const existingColumns = (
  db.pragma("table_info(games)") as { name: string }[]
).map((c) => c.name);
if (!existingColumns.includes("image_filename")) {
  db.exec("ALTER TABLE games ADD COLUMN image_filename TEXT");
}
