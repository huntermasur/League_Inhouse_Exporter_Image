import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Project root is two levels up from server/services/
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT_PATH = path.join(__dirname, "get_champion_hints.py");
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
