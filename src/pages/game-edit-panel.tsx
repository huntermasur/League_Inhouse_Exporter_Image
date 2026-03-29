import { useState, useEffect } from "react";
import type { GameDetail, ParsedGame, ParsedPlayer } from "@/types";
import { fetchChampions, updateGame } from "../shared/api.js";
import { ChampionSelect } from "../shared/components/champion-select.js";
import styles from "./parsed-preview.module.css";

const POSITIONS = ["Top", "Jungle", "Mid", "Bot", "Support"] as const;

interface Props {
  game: GameDetail;
  onSave: (updated: GameDetail) => void;
  onDiscard: () => void;
}

/** Convert the stored GameDetail shape into the ParsedGame shape used by the edit form. */
function toParsedGame(game: GameDetail): ParsedGame {
  return {
    winning_team: game.winning_team,
    players: game.players.map((p) => ({
      team: p.team,
      position: p.position,
      username: p.username,
      champion: p.champion,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
    })),
    bans: game.bans.map((b) => ({
      team: b.team,
      position: b.position,
      champion: b.champion,
    })),
  };
}

export function GameEditPanel({ game, onSave, onDiscard }: Props) {
  const [draft, setDraft] = useState<ParsedGame>(() => toParsedGame(game));
  const [champions, setChampions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChampions()
      .then(setChampions)
      .catch(() => {
        /* non-fatal */
      });
  }, []);

  function updatePlayer(
    idx: number,
    field: keyof ParsedPlayer,
    value: string | number,
  ) {
    setDraft((prev) => ({
      ...prev,
      players: prev.players.map((p, i) =>
        i === idx ? { ...p, [field]: value } : p,
      ),
    }));
  }

  function updateBan(idx: number, value: string) {
    setDraft((prev) => ({
      ...prev,
      bans: prev.bans.map((b, i) =>
        i === idx ? { ...b, champion: value } : b,
      ),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await updateGame(game.id, draft);
      // Reconstruct the updated GameDetail locally so the parent
      // can re-render without a round-trip fetch.
      const updatedDetail: GameDetail = {
        ...game,
        winning_team: draft.winning_team,
        players: draft.players.map((p, i) => ({
          id: game.players[i]?.id ?? i,
          game_id: game.id,
          role: (["Top", "Jungle", "Mid", "Bot", "Support"] as const)[
            p.position - 1
          ],
          ...p,
        })),
        bans: draft.bans.map((b, i) => ({
          id: game.bans[i]?.id ?? i,
          game_id: game.id,
          ...b,
        })),
      };
      onSave(updatedDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  const team1Players = draft.players.filter((p) => p.team === 1);
  const team2Players = draft.players.filter((p) => p.team === 2);
  const team1Bans = draft.bans.filter((b) => b.team === 1);
  const team2Bans = draft.bans.filter((b) => b.team === 2);
  const team1Won = draft.winning_team === 1;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Edit Game</h1>
      <p className={styles.sub}>
        Correct any details below then save your changes.
      </p>

      {game.image_filename && (
        <img
          src={`/uploads/${game.image_filename}`}
          alt="Postgame screenshot"
          className={styles.screenshot}
        />
      )}

      <div className={styles.winnerRow}>
        <label className={styles.label} htmlFor="edit-winning-team">
          Winning team
        </label>
        <select
          id="edit-winning-team"
          className={styles.select}
          value={draft.winning_team}
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              winning_team: Number(e.target.value) as 1 | 2,
            }))
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
                  const globalIdx = draft.players.indexOf(p);
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

            {bans.length > 0 && (
              <div className={styles.bans}>
                <span className={styles.bansLabel}>Bans:</span>
                {bans.map((b) => {
                  const globalIdx = draft.bans.indexOf(b);
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
            )}
          </section>
        );
      })}

      {error && (
        <p role="alert" className={styles.errorMsg}>
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button
          className={styles.cancelBtn}
          onClick={onDiscard}
          disabled={saving}
        >
          Discard
        </button>
        <button
          className={styles.confirmBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
