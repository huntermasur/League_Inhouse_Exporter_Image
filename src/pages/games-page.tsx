import { useState, useEffect, useCallback } from "react";
import type { Game, GameDetail } from "@/types";
import { fetchGames, fetchGame, deleteGame } from "../shared/api.js";
import { GameEditPanel } from "./game-edit-panel.js";
import styles from "./games-page.module.css";

export function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<GameDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchGames()
      .then(setGames)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load games"),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = useCallback(
    async (id: string) => {
      if (selected?.id === id) {
        setSelected(null);
        setIsEditing(false);
        return;
      }
      setIsEditing(false);
      setSelectedLoading(true);
      try {
        const detail = await fetchGame(id);
        setSelected(detail);
      } catch {
        // ignore
      } finally {
        setSelectedLoading(false);
      }
    },
    [selected],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm(`Delete game ${id.slice(0, 8)}…? This cannot be undone.`))
        return;
      setDeletingId(id);
      try {
        await deleteGame(id);
        setGames((prev) => prev.filter((g) => g.id !== id));
        if (selected?.id === id) {
          setSelected(null);
          setIsEditing(false);
        }
      } catch {
        // ignore
      } finally {
        setDeletingId("");
      }
    },
    [selected],
  );

  const handleEditSave = useCallback((updated: GameDetail) => {
    setSelected(updated);
    setGames((prev) =>
      prev.map((g) =>
        g.id === updated.id ? { ...g, winning_team: updated.winning_team } : g,
      ),
    );
    setIsEditing(false);
  }, []);

  const handleEditDiscard = useCallback(() => {
    setIsEditing(false);
  }, []);

  if (loading) return <div className={styles.status}>Loading games…</div>;
  if (error)
    return (
      <p role="alert" className={styles.error}>
        {error}
      </p>
    );

  if (games.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No games recorded yet.</p>
        <p>
          Head to <strong>Upload</strong> to add your first game.
        </p>
      </div>
    );
  }

  const team1Won = selected ? selected.winning_team === 1 : false;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Game History</h1>

      <ul className={styles.list}>
        {games.map((g) => (
          <li
            key={g.id}
            className={`${styles.row} ${selected?.id === g.id ? styles.rowActive : ""}`}
          >
            <button
              className={styles.rowBtn}
              onClick={() => handleSelect(g.id)}
              aria-expanded={selected?.id === g.id}
            >
              <span className={styles.gameId}>{g.id.slice(0, 8)}…</span>
              <span className={styles.date}>
                {new Date(g.created_at).toLocaleDateString()}
              </span>
              <span
                className={`${styles.result} ${g.winning_team === 1 ? styles.team1 : styles.team2}`}
              >
                Team {g.winning_team} won
              </span>
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => handleDelete(g.id)}
              disabled={deletingId === g.id}
              aria-label={`Delete game ${g.id.slice(0, 8)}`}
            >
              {deletingId === g.id ? "…" : "✕"}
            </button>
          </li>
        ))}
      </ul>

      {selectedLoading && (
        <div className={styles.status}>Loading game details…</div>
      )}

      {selected && !selectedLoading && (
        <section className={styles.detail} aria-label="Game detail">
          <div className={styles.detailHeader}>
            <h2 className={styles.detailHeading}>
              Game <code>{selected.id.slice(0, 8)}…</code>
            </h2>
            {!isEditing && (
              <button
                className={styles.editBtn}
                onClick={() => setIsEditing(true)}
                aria-label={`Edit game ${selected.id.slice(0, 8)}`}
              >
                ✎ Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <GameEditPanel
              game={selected}
              onSave={handleEditSave}
              onDiscard={handleEditDiscard}
            />
          ) : (
            <div className={styles.detailLayout}>
              <div className={styles.detailContent}>
                {([1, 2] as const).map((team) => {
                  const players = selected.players.filter(
                    (p) => p.team === team,
                  );
                  const bans = selected.bans.filter((b) => b.team === team);
                  const won = (team === 1) === team1Won;

                  return (
                    <div key={team} className={styles.teamBlock}>
                      <h3
                        className={`${styles.teamLabel} ${won ? styles.win : styles.loss}`}
                      >
                        Team {team} — {won ? "Victory" : "Defeat"}
                      </h3>
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
                          {players.map((p) => (
                            <tr key={p.id}>
                              <td className={styles.role}>{p.role}</td>
                              <td>{p.username}</td>
                              <td className={styles.champion}>{p.champion}</td>
                              <td className={styles.k}>{p.kills}</td>
                              <td className={styles.d}>{p.deaths}</td>
                              <td className={styles.a}>{p.assists}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {bans.length > 0 && (
                        <div className={styles.bansList}>
                          <span className={styles.bansLabel}>Bans:</span>
                          {bans.map((b) => (
                            <span key={b.id} className={styles.banChip}>
                              {b.champion}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selected.image_filename && (
                <div className={styles.detailImageCol}>
                  <img
                    src={`/uploads/${selected.image_filename}`}
                    alt="Postgame screenshot"
                    className={styles.screenshot}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
