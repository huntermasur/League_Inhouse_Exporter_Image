import type {
  Game,
  GameDetail,
  PlayerGameStat,
  ChampionKdaStat,
  ChampionPickStat,
  ChampionBanStat,
  ChampionStatSummary,
  PlayerStatSummary,
  RolePerformanceStat,
  ParsedGame,
} from "@/types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Games ────────────────────────────────────────────────────────────────────

export function fetchGames(): Promise<Game[]> {
  return request<Game[]>("/api/games");
}

export function fetchGame(id: string): Promise<GameDetail> {
  return request<GameDetail>(`/api/games/${id}`);
}

export function deleteGame(id: string): Promise<void> {
  return request<void>(`/api/games/${id}`, { method: "DELETE" });
}

export async function parseScreenshot(
  file: File,
): Promise<{ tempFile: string; parsed: ParsedGame }> {
  const body = new FormData();
  body.append("screenshot", file);
  return request<{ tempFile: string; parsed: ParsedGame }>("/api/games/parse", {
    method: "POST",
    body,
  });
}

export function saveGame(
  tempFile: string,
  parsed: ParsedGame,
): Promise<{ id: string }> {
  return request<{ id: string }>("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tempFile, parsed }),
  });
}

export function updateGame(
  id: string,
  parsed: ParsedGame,
): Promise<{ id: string }> {
  return request<{ id: string }>(`/api/games/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parsed }),
  });
}

// ── Champions ─────────────────────────────────────────────────────────────────

export function fetchChampions(): Promise<string[]> {
  return request<string[]>("/api/champions");
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function fetchPlayerStats(): Promise<PlayerGameStat[]> {
  return request<PlayerGameStat[]>("/api/stats/players");
}

export function fetchChampionKda(): Promise<ChampionKdaStat[]> {
  return request<ChampionKdaStat[]>("/api/stats/champion-kda");
}

export function fetchChampionPicks(): Promise<ChampionPickStat[]> {
  return request<ChampionPickStat[]>("/api/stats/champion-picks");
}

export function fetchChampionBans(): Promise<ChampionBanStat[]> {
  return request<ChampionBanStat[]>("/api/stats/champion-bans");
}

export function fetchChampionStats(): Promise<ChampionStatSummary[]> {
  return request<ChampionStatSummary[]>("/api/stats/champion-stats");
}

export function fetchPlayerStatsFull(): Promise<PlayerStatSummary[]> {
  return request<PlayerStatSummary[]>("/api/stats/player-stats-full");
}

export function fetchRolePerformance(): Promise<RolePerformanceStat[]> {
  return request<RolePerformanceStat[]>("/api/stats/role-performance");
}
