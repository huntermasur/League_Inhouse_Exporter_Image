import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import type { ParsedGame } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Project root is two levels up from server/services/
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT_PATH = path.join(__dirname, "get_champion_hints.py");
const PARSE_SCRIPT_PATH = path.join(__dirname, "parse_scoreboard.py");
const TIMEOUT_MS = 90_000;

export interface ChampionHint {
  row_index: number;
  /** [championName, score] pairs sorted by score descending */
  top_matches: [string, number][];
}

/**
 * Runs template-matching champion identification against the given screenshot.
 *
 * Returns an array of per-row hints (one per detected player, top-to-bottom)
 * so Gemini can use them as strong priors when the icon is ambiguous.
 *
 * Returns null if Python is unavailable, champion images aren't set up,
 * or the script fails for any reason — callers should treat null as
 * "no hints available" and proceed with Gemini-only parsing.
 */
export async function getChampionHints(
  imagePath: string,
): Promise<ChampionHint[] | null> {
  return new Promise((resolve) => {
    // Try `python` first (Windows default); the error handler falls back gracefully.
    const python = spawn("python", [SCRIPT_PATH, imagePath], {
      cwd: PROJECT_ROOT,
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      python.kill();
      console.warn(
        "[champion-hints] Python script timed out after",
        TIMEOUT_MS,
        "ms",
      );
      resolve(null);
    }, TIMEOUT_MS);

    python.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    python.on("close", () => {
      clearTimeout(timer);

      if (!stdout.trim()) {
        console.warn(
          "[champion-hints] No output from Python script:",
          stderr.trim(),
        );
        resolve(null);
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim());

        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed) &&
          parsed.error
        ) {
          console.warn("[champion-hints] Script reported error:", parsed.error);
          resolve(null);
          return;
        }

        if (!Array.isArray(parsed)) {
          console.warn("[champion-hints] Unexpected output shape");
          resolve(null);
          return;
        }

        resolve(parsed as ChampionHint[]);
      } catch {
        console.warn(
          "[champion-hints] Failed to parse script output:",
          stdout.slice(0, 200),
        );
        resolve(null);
      }
    });

    python.on("error", (err) => {
      clearTimeout(timer);
      console.warn("[champion-hints] Could not start Python:", err.message);
      resolve(null);
    });
  });
}

/**
 * Runs the full local parsing pipeline against the given screenshot.
 *
 * Spawns parse_scoreboard.py which uses template matching + OCR to extract:
 *   - Champion names (template matching against DDragon portraits)
 *   - Player names and K/D/A (Tesseract OCR)
 *   - Winning team (OCR for VICTORY/DEFEAT)
 *   - Ban icons (per-row Hough detection + template matching, best-effort)
 *
 * Throws on failure, so callers can surface a 500 error to the client.
 */
export async function parseScoreboardLocally(
  imagePath: string,
): Promise<ParsedGame> {
  return new Promise((resolve, reject) => {
    const python = spawn("python", [PARSE_SCRIPT_PATH, imagePath], {
      cwd: PROJECT_ROOT,
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      python.kill();
      reject(
        new Error(
          "Local parser timed out. The screenshot may be unusually large or complex.",
        ),
      );
    }, TIMEOUT_MS);

    python.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    python.on("close", () => {
      clearTimeout(timer);

      if (!stdout.trim()) {
        reject(
          new Error(
            `Parser produced no output. Stderr: ${stderr.slice(0, 500)}`,
          ),
        );
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim());

        if (parsed?.error) {
          reject(new Error(parsed.error));
          return;
        }

        resolve(parsed as ParsedGame);
      } catch {
        reject(
          new Error(`Failed to parse script output: ${stdout.slice(0, 200)}`),
        );
      }
    });

    python.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Could not start Python: ${err.message}. Ensure Python is installed with opencv-python, pytesseract, and numpy.`,
        ),
      );
    });
  });
}
