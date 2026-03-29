import { useState, useEffect } from 'react';
import type { PlayerGameStat, ChampionKdaStat, ChampionPickStat, ChampionBanStat } from '@/types';
import {
  fetchPlayerStats,
  fetchChampionKda,
  fetchChampionPicks,
  fetchChampionBans,
} from '../shared/api.js';
import { GamesPlayedChart } from '../features/stats/games-played-chart.js';
import { WinPercentChart } from '../features/stats/win-percent-chart.js';
import { ChampionKdaChart } from '../features/stats/champion-kda-chart.js';
import { ChampionPickChart } from '../features/stats/champion-pick-chart.js';
import { ChampionBanCountChart } from '../features/stats/champion-ban-count-chart.js';
import { ChampionBanDistributionChart } from '../features/stats/champion-ban-distribution-chart.js';
import { ChampionBanRateChart } from '../features/stats/champion-ban-rate-chart.js';
import styles from './stats-page.module.css';

export function StatsPage() {
  const [playerStats, setPlayerStats] = useState<PlayerGameStat[]>([]);
  const [kdaStats, setKdaStats] = useState<ChampionKdaStat[]>([]);
  const [pickStats, setPickStats] = useState<ChampionPickStat[]>([]);
  const [banStats, setBanStats] = useState<ChampionBanStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetchPlayerStats(),
      fetchChampionKda(),
      fetchChampionPicks(),
      fetchChampionBans(),
    ])
      .then(([players, kda, picks, bans]) => {
        setPlayerStats(players);
        setKdaStats(kda);
        setPickStats(picks);
        setBanStats(bans);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.status}>Loading stats…</div>;
  if (error) return <p role="alert" className={styles.error}>{error}</p>;

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

      <div className={styles.grid}>
        <div className={styles.card}>
          <GamesPlayedChart data={playerStats} />
        </div>
        <div className={styles.card}>
          <WinPercentChart data={playerStats} />
        </div>
        <div className={`${styles.card} ${styles.wide}`}>
          <ChampionKdaChart data={kdaStats} />
        </div>
        <div className={styles.card}>
          <ChampionPickChart data={pickStats} />
        </div>
        <div className={styles.card}>
          <ChampionBanCountChart data={banStats} />
        </div>
        <div className={styles.card}>
          <ChampionBanRateChart data={banStats} />
        </div>
        <div className={`${styles.card} ${styles.wide}`}>
          <ChampionBanDistributionChart data={banStats} />
        </div>
      </div>
    </div>
  );
}
