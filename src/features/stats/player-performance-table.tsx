import type { PlayerStatSummary } from "@/types";
import styles from "./performance-table.module.css";

interface Props {
  data: PlayerStatSummary[];
}

export function PlayerPerformanceTable({ data }: Props) {
  return (
    <>
      <h2 className={styles.title}>Player Performance</h2>
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Player</th>
              <th>Games</th>
              <th>W / L</th>
              <th>Win Rate</th>
              <th>K / D / A</th>
              <th>KDA</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.username}>
                <td className={styles.nameCell}>{row.username}</td>
                <td>{row.games_played}</td>
                <td>
                  <span className={styles.win}>{row.wins}</span>
                  {" / "}
                  <span className={styles.loss}>{row.losses}</span>
                </td>
                <td>
                  <span
                    className={
                      row.win_pct >= 50 ? styles.winRate : styles.lossRate
                    }
                  >
                    {row.win_pct}%
                  </span>
                </td>
                <td className={styles.kda}>
                  {row.avg_kills} / {row.avg_deaths} / {row.avg_assists}
                </td>
                <td className={styles.kdaRatio}>{row.kda}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
