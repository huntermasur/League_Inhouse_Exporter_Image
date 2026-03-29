#!/usr/bin/env node
/**
 * scripts/download-champion-images.mjs
 *
 * Downloads every champion's square portrait from Data Dragon into
 * data/champion_images/<ChampionId>.png
 *
 * Usage:
 *   node scripts/download-champion-images.mjs
 *   node scripts/download-champion-images.mjs --version 15.6.1
 *
 * The filenames use the DDragon champion ID (e.g. LeeSin.png, Chogath.png),
 * which is what scoreboard_reader.py uses to key the icon dictionary.
 */

import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "data", "champion_images");
const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";
const CONCURRENCY = 10; // parallel downloads at once

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destPath));
}

async function runConcurrent(tasks, concurrency) {
  let index = 0;
  let completed = 0;
  const total = tasks.length;

  async function worker() {
    while (index < tasks.length) {
      const task = tasks[index++];
      await task();
      completed++;
      process.stdout.write(`\r  ${completed}/${total}`);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  process.stdout.write("\n");
}

// ── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const versionFlag = args.indexOf("--version");
let version;

if (versionFlag !== -1 && args[versionFlag + 1]) {
  version = args[versionFlag + 1];
} else {
  process.stdout.write("Fetching latest Data Dragon version... ");
  const versions = await fetchJson(`${DDRAGON_BASE}/api/versions.json`);
  version = versions[0];
  console.log(version);
}

console.log(`Fetching champion list for patch ${version}...`);
const championData = await fetchJson(
  `${DDRAGON_BASE}/cdn/${version}/data/en_US/champion.json`,
);

const champions = Object.values(championData.data);
console.log(`Found ${champions.length} champions.`);

fs.mkdirSync(OUT_DIR, { recursive: true });

// Skip champions whose portrait already exists to allow incremental updates
const toDownload = champions.filter((champ) => {
  const dest = path.join(OUT_DIR, champ.image.full);
  return !fs.existsSync(dest);
});

if (toDownload.length === 0) {
  console.log("All champion portraits already downloaded — nothing to do.");
  process.exit(0);
}

console.log(`Downloading ${toDownload.length} portrait(s) to ${OUT_DIR}`);

const tasks = toDownload.map((champ) => async () => {
  const url = `${DDRAGON_BASE}/cdn/${version}/img/champion/${champ.image.full}`;
  const dest = path.join(OUT_DIR, champ.image.full);
  await downloadFile(url, dest);
});

await runConcurrent(tasks, CONCURRENCY);

console.log(`Done. ${champions.length} champion portraits ready.`);
