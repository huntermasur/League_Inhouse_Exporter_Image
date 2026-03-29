import { useState, useEffect } from "react";
import type {
  PlayerGameStat,
  ChampionKdaStat,
  ChampionPickStat,
  ChampionBanStat,
  ChampionStatSummary,
  PlayerStatSummary,
  RolePerformanceStat,
} from "@/types";
import {
  fetchPlayerStats,
  fetchChampionKda,
  fetchChampionPicks,
  fetchChampionBans,
  fetchChampionStats,
  fetchPlayerStatsFull,
  fetchRolePerformance,
} from "../shared/api.js";
import { ChampionWinRateChart } from "../features/stats/champion-win-rate-chart.js";
import { WinPercentChart } from "../features/stats/win-percent-chart.js";
import { ChampionPickDistributionChart } from "../features/stats/champion-pick-distribution-chart.js";
import { ChampionBanDistributionChart } from "../features/stats/champion-ban-distribution-chart.js";
import { ChampionPickRateChart } from "../features/stats/champion-pick-rate-chart.js";
import { ChampionKdaChart } from "../features/stats/champion-kda-chart.js";
import { PlayerKdaChart } from "../features/stats/player-kda-chart.js";
import { RolePerformanceChart } from "../features/stats/role-performance-chart.js";
import { ChampionPerformanceTable } from "../features/stats/champion-performance-table.js";
import { PlayerPerformanceTable } from "../features/stats/player-performance-table.js";
import styles from "./stats-page.module.css";

export function StatsPage() {
  const [playerStats, setPlayerStats] = useState<PlayerGameStat[]>([]);
  const [kdaStats, setKdaStats] = useState<ChampionKdaStat[]>([]);
  const [pickStats, setPickStats] = useState<ChampionPickStat[]>([]);
  const [banStats, setBanStats] = useState<ChampionBanStat[]>([]);
  const [championStats, setChampionStats] = useState<ChampionStatSummary[]>([]);
  const [playerStatsFull, setPlayerStatsFull] = useState<PlayerStatSummary[]>(
    [],
  );
  const [rolePerformance, setRolePerformance] = useState<RolePerformanceStat[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchPlayerStats(),
      fetchChampionKda(),
      fetchChampionPicks(),
      fetchChampionBans(),
      fetchChampionStats(),
      fetchPlayerStatsFull(),
      fetchRolePerformance(),
    ])
      .then(([players, kda, picks, bans, champStats, playerFull, roles]) => {
        setPlayerStats(players);
        setKdaStats(kda);
        setPickStats(picks);
        setBanStats(bans);
        setChampionStats(champStats);
        setPlayerStatsFull(playerFull);
        setRolePerformance(roles);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load stats"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.status}>Loading stats…</div>;
  if (error)
    return (
      <p role="alert" className={styles.error}>
        {error}
      </p>
    );

  if (playerStats.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No data yet — upload some games first.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Stats Dashboard</h1>

      {/* Row 1: Champion Win Rates + Player Win Rates */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <ChampionWinRateChart data={championStats} />
        </div>
        <div className={styles.card}>
          <WinPercentChart data={playerStats} />
        </div>
      </div>

      {/* Row 2: Champion Pick Distribution + Most Banned Champions */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <ChampionPickDistributionChart data={pickStats} />
        </div>
        <div className={styles.card}>
          <ChampionBanDistributionChart data={banStats} />
        </div>
      </div>

      {/* Row 3: Champion Pick Rate (full width) */}
      <div className={styles.wideCard}>
        <ChampionPickRateChart data={pickStats} />
      </div>

      {/* Row 4: Champion KDA scatter + Player KDA bubble */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <ChampionKdaChart data={kdaStats} />
        </div>
        <div className={styles.card}>
          <PlayerKdaChart data={playerStatsFull} />
        </div>
      </div>

      {/* Row 5: Role Performance radar (full width) */}
      <div className={styles.wideCard}>
        <RolePerformanceChart data={rolePerformance} />
      </div>

      {/* Row 6: Champion Performance table + Player Performance table */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <ChampionPerformanceTable data={championStats} />
        </div>
        <div className={styles.card}>
          <PlayerPerformanceTable data={playerStatsFull} />
        </div>
      </div>
    </div>
  );
}
