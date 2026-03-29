import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { parseScoreboardLocally } from "../services/python-bridge.js";
import {
  getAllGames,
  getGameById,
  insertGame,
  deleteGame,
  getPlayerGameStats,
  getChampionKdaStats,
  getChampionPickStats,
  getChampionBanStats,
} from "../services/gameRepository.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "data", "uploads");
const CHAMPION_IMAGES_DIR = path.join(__dirname, "..", "..", "data", "champion_images");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, or WEBP images are accepted"));
    }
  },
});

const router = Router();

// ── Games ─────────────────────────────────────────────────────────────────────

// GET /api/games
router.get("/games", (_req, res) => {
  const games = getAllGames();
  res.json(games);
});

// GET /api/games/:id
router.get("/games/:id", (req, res) => {
  const game = getGameById(req.params.id);
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json(game);
});

// DELETE /api/games/:id
router.delete("/games/:id", (req, res) => {
  const deleted = deleteGame(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.status(204).send();
});

// ── Upload + Parse ────────────────────────────────────────────────────────────

// POST /api/games/parse  — parse only, does NOT save to DB yet
router.post("/games/parse", upload.single("screenshot"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No screenshot file provided" });
    return;
  }

  try {
    const parsed = await parseScoreboardLocally(req.file.path);
    res.json({ tempFile: req.file.filename, parsed });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    const message = err instanceof Error ? err.message : String(err);
    console.error("Parse error:", message);
    res.status(500).json({ error: `Failed to parse screenshot: ${message}` });
  }
});

// POST /api/games  — confirm and save a previously parsed game
router.post("/games", (req, res) => {
  const { tempFile, parsed } = req.body as {
    tempFile: string;
    parsed: unknown;
  };

  if (!parsed || typeof parsed !== "object") {
    res.status(400).json({ error: "Missing parsed game data" });
    return;
  }

  const data = parsed as {
    winning_team: 1 | 2;
    players: {
      team: 1 | 2;
      position: 1 | 2 | 3 | 4 | 5;
      username: string;
      champion: string;
      kills: number;
      deaths: number;
      assists: number;
    }[];
    bans: { team: 1 | 2; position: 1 | 2 | 3 | 4 | 5; champion: string }[];
  };

  const id = uuidv4();
  insertGame({
    id,
    winning_team: data.winning_team,
    image_filename: tempFile ?? null,
    players: data.players,
    bans: data.bans,
  });

  // Temp file is now the permanent game image — do not delete it.

  res.status(201).json({ id });
});

// ── Champions ─────────────────────────────────────────────────────────────────

// GET /api/champions — list of all champion names derived from local icon files
router.get("/champions", (_req, res) => {
  const files = fs.readdirSync(CHAMPION_IMAGES_DIR);
  const champions = files
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.replace(/\.png$/, ""))
    .sort();
  res.json(champions);
});

// ── Stats ─────────────────────────────────────────────────────────────────────

// GET /api/stats/players
router.get("/stats/players", (_req, res) => {
  res.json(getPlayerGameStats());
});

// GET /api/stats/champion-kda
router.get("/stats/champion-kda", (_req, res) => {
  res.json(getChampionKdaStats());
});

// GET /api/stats/champion-picks
router.get("/stats/champion-picks", (_req, res) => {
  res.json(getChampionPickStats());
});

// GET /api/stats/champion-bans
router.get("/stats/champion-bans", (_req, res) => {
  res.json(getChampionBanStats());
});

export default router;
