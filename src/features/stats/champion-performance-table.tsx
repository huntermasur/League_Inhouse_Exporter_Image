import type { ChampionStatSummary } from "@/types";
import styles from "./performance-table.module.css";

interface Props {
  data: ChampionStatSummary[];
}

export function ChampionPerformanceTable({ data }: Props) {
  return (
    <>
      <h2 className={styles.title}>Champion Performance</h2>
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Champion</th>
              <th>Games</th>
              <th>W / L</th>
              <th>Win Rate</th>
              <th>K / D / A</th>
              <th>KDA</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.champion}>
                <td className={styles.nameCell}>{row.champion}</td>
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
