import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import type { ParsedGame } from '../types.js';
import { getChampionHints, type ChampionHint } from './python-bridge.js';

const BASE_PROMPT = `You are analyzing a League of Legends post-game scoreboard screenshot.

Extract the following data and return it as valid JSON only — no markdown, no explanation, just the raw JSON object.

The JSON shape must be exactly:
{
  "winning_team": <1 or 2>,
  "players": [
    {
      "team": <1 or 2>,
      "position": <1=Top, 2=Jungle, 3=Mid, 4=Bot, 5=Support>,
      "username": "<summoner name>",
      "champion": "<champion name as it appears in League of Legends>",
      "kills": <number>,
      "deaths": <number>,
      "assists": <number>
    }
  ],
  "bans": [
    {
      "team": <1 or 2>,
      "position": <1=Top, 2=Jungle, 3=Mid, 4=Bot, 5=Support>,
      "champion": "<champion name>"
    }
  ]
}

Rules:
- Team 1 is the top team (blue side/VICTORY team if they won, otherwise the losing team — determine winning_team from the VICTORY/DEFEAT header).
- winning_team is 1 if Team 1 won, 2 if Team 2 won.
- Players are listed top-to-bottom within each team; order is Top(1), Jungle(2), Mid(3), Bot(4), Support(5).
- Bans are shown in the "BANS + OBJECTIVES" column on the right, 5 per team. Assign position 1-5 in order left-to-right, top-to-bottom matching the player order.
- Use official champion names (e.g. "Miss Fortune", "Cho'Gath", "Wukong").
- K/D/A values are integers.
- If a ban icon is missing or obscured, use "Unknown".
- Return ONLY the JSON. No extra text.`;

/**
 * Appends template-matching champion hints to the base prompt when available.
 * Hints list top candidate champions per player row (top-to-bottom), giving
 * Gemini stronger priors to resolve visually ambiguous icons.
 */
function buildPrompt(hints: ChampionHint[] | null): string {
  if (!hints || hints.length === 0) {
    return BASE_PROMPT;
  }

  const rows = hints.map((h, i) => {
    const team = i < 5 ? 1 : 2;
    const playerNum = i < 5 ? i + 1 : i - 4;
    const candidates = h.top_matches
      .slice(0, 5)
      .map(([name]) => name)
      .join(', ');
    return `  Team ${team} Player ${playerNum}: ${candidates}`;
  });

  return (
    BASE_PROMPT +
    `\n\nCHAMPION ICON HINTS (from image template-matching, players listed top-to-bottom):
${rows.join('\n')}
The correct champion for each player is almost certainly one of the listed candidates. Use these hints together with your own visual analysis to resolve any ambiguous icons.`
  );
}

export async function parseGameScreenshot(imagePath: string): Promise<ParsedGame> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  // Run template matching and Gemini setup in parallel to avoid serial latency.
  const [hints, imageData] = await Promise.all([
    getChampionHints(imagePath),
    Promise.resolve(fs.readFileSync(imagePath)),
  ]);

  if (hints) {
    console.log(`[champion-hints] Injecting hints for ${hints.length} player rows`);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const base64Image = imageData.toString('base64');
  const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  const result = await model.generateContent([
    buildPrompt(hints),
    {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    },
  ]);

  const text = result.response.text().trim();

  // Strip any accidental markdown code fences
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  const parsed: ParsedGame = JSON.parse(cleaned);
  return parsed;
}
