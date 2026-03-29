import { useState, useEffect } from "react";
import type { ParsedGame, ParsedPlayer } from "@/types";
import { fetchChampions } from "../shared/api.js";
import { ChampionSelect } from "../shared/components/champion-select.js";
import styles from "./parsed-preview.module.css";

const POSITIONS = ["Top", "Jungle", "Mid", "Bot", "Support"] as const;

interface Props {
  parsed: ParsedGame;
  tempFile: string;
  onChange: (game: ParsedGame) => void;
  onConfirm: (game: ParsedGame) => void;
  onCancel: () => void;
  saving: boolean;
}

export function ParsedPreview({
  parsed,
  tempFile,
  onChange,
  onConfirm,
  onCancel,
  saving,
}: Props) {
  const [champions, setChampions] = useState<string[]>([]);

  useEffect(() => {
    fetchChampions()
      .then(setChampions)
      .catch(() => {
        /* non-fatal — inputs still work as free-text fallback */
      });
  }, []);
  function updatePlayer(
    idx: number,
    field: keyof ParsedPlayer,
    value: string | number,
  ) {
    const players = parsed.players.map((p, i) =>
      i === idx ? { ...p, [field]: value } : p,
    );
    onChange({ ...parsed, players });
  }

  function updateBan(idx: number, value: string) {
    const bans = parsed.bans.map((b, i) =>
      i === idx ? { ...b, champion: value } : b,
    );
    onChange({ ...parsed, bans });
  }

  const team1Players = parsed.players.filter((p) => p.team === 1);
  const team2Players = parsed.players.filter((p) => p.team === 2);
  const team1Bans = parsed.bans.filter((b) => b.team === 1);
  const team2Bans = parsed.bans.filter((b) => b.team === 2);
  const team1Won = parsed.winning_team === 1;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Review Parsed Data</h1>
      <p className={styles.sub}>
        Check and correct anything Gemini may have misread before saving.
      </p>

      <img
        src={`/uploads/${tempFile}`}
        alt="Uploaded postgame screenshot"
        className={styles.screenshot}
      />

      <div className={styles.winnerRow}>
        <label className={styles.label}>Winning team</label>
        <select
          className={styles.select}
          value={parsed.winning_team}
          onChange={(e) =>
            onChange({
              ...parsed,
              winning_team: Number(e.target.value) as 1 | 2,
            })
          }
        >
          <option value={1}>Team 1</option>
          <option value={2}>Team 2</option>
        </select>
      </div>

      {([1, 2] as const).map((team) => {
        const players = team === 1 ? team1Players : team2Players;
        const bans = team === 1 ? team1Bans : team2Bans;
        const won = (team === 1) === team1Won;

        return (
          <section key={team} className={styles.teamSection}>
            <h2
              className={`${styles.teamHeading} ${won ? styles.win : styles.loss}`}
            >
              Team {team} — {won ? "Victory" : "Defeat"}
            </h2>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Username</th>
                  <th>Champion</th>
                  <th>K</th>
                  <th>D</th>
                  <th>A</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const globalIdx = parsed.players.indexOf(p);
                  return (
                    <tr key={globalIdx}>
                      <td className={styles.role}>
                        <select
                          className={styles.select}
                          value={p.position}
                          onChange={(e) =>
                            updatePlayer(
                              globalIdx,
                              "position",
                              Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                            )
                          }
                          aria-label={`Role for ${p.username}`}
                        >
                          {POSITIONS.map((role, i) => (
                            <option key={role} value={i + 1}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          value={p.username}
                          onChange={(e) =>
                            updatePlayer(globalIdx, "username", e.target.value)
                          }
                          aria-label={`Username for ${POSITIONS[p.position - 1]}`}
                        />
                      </td>
                      <td>
                        <ChampionSelect
                          value={p.champion}
                          champions={champions}
                          onChange={(val) =>
                            updatePlayer(globalIdx, "champion", val)
                          }
                          aria-label={`Champion for ${POSITIONS[p.position - 1]}`}
                        />
                      </td>
                      {(["kills", "deaths", "assists"] as const).map((stat) => (
                        <td key={stat}>
                          <input
                            className={`${styles.input} ${styles.numInput}`}
                            type="number"
                            min={0}
                            value={p[stat]}
                            onChange={(e) =>
                              updatePlayer(
                                globalIdx,
                                stat,
                                Number(e.target.value),
                              )
                            }
                            aria-label={`${stat} for ${p.username}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={styles.bans}>
              <span className={styles.bansLabel}>Bans:</span>
              {bans.map((b) => {
                const globalIdx = parsed.bans.indexOf(b);
                return (
                  <div key={globalIdx} className={styles.banSelectWrap}>
                    <ChampionSelect
                      value={b.champion}
                      champions={champions}
                      onChange={(val) => updateBan(globalIdx, val)}
                      aria-label={`Ban ${b.position} for team ${team}`}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className={styles.actions}>
        <button
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className={styles.confirmBtn}
          onClick={() => onConfirm(parsed)}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Game"}
        </button>
      </div>
    </div>
  );
}
