# League Inhouse Stats

> Upload a League of Legends postgame screenshot, automatically extract player stats with Gemini Vision, store them locally, and visualise your inhouse group'\''s data.

## Tech Stack

```
Browser (React + TypeScript + Vite)
        ¦  /api/* proxy
        ?
Express (Node.js + TypeScript)
        ¦
        ?
SQLite (better-sqlite3)
        ¦  image upload
        ?
Google Gemini 2.0 Flash (image parsing)
```

## Features

- **Upload** — drag-and-drop a scoreboard screenshot; Gemini reads all 10 players, KDA, champion picks, bans, and win/loss automatically
- **Review** — edit any field Gemini may have misread before saving
- **Game History** — browse games by ID, expand detail, delete by ID
- **Stats Dashboard** — 7 charts: games played, win %, champion KDA, pick count, ban count, ban rate, ban distribution pie

## Prerequisites

- Node.js 20+
- A free [Google AI Studio](https://aistudio.google.com) API key

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key
cp .env.example .env
# Then edit .env and set GEMINI_API_KEY=your_key_here

# 3. Start the dev server (frontend + backend run concurrently)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start frontend (Vite) + backend (Express) concurrently |
| `npm run server` | Start only the Express backend on port 3001 |
| `npm run build` | Type-check and bundle for production |
| `npm run lint` | Run ESLint |

## Project Structure

```
server/
  index.ts              Express entry point
  db/database.ts        SQLite setup and schema
  services/
    gemini.ts           Gemini Vision image parsing
    gameRepository.ts   All DB queries
  routes/api.ts         REST API routes
  types.ts              Shared types (server + frontend)

src/
  app/                  Router shell + nav
  pages/                Route-level components
  features/stats/       Chart components (Recharts)
  shared/api.ts         Typed fetch helpers

data/                   SQLite DB + temp uploads (gitignored)
```

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/games` | List all games |
| `GET` | `/api/games/:id` | Get game + players + bans |
| `DELETE` | `/api/games/:id` | Delete a game |
| `POST` | `/api/games/parse` | Parse screenshot with Gemini (multipart/form-data `screenshot`) |
| `POST` | `/api/games` | Confirm and save a parsed game |
| `GET` | `/api/stats/players` | Per-player games played + win % |
| `GET` | `/api/stats/champion-kda` | Average K/D/A per champion |
| `GET` | `/api/stats/champion-picks` | Pick count per champion |
| `GET` | `/api/stats/champion-bans` | Ban count + ban rate per champion |
