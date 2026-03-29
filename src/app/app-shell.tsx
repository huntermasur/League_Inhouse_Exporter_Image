import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Nav } from "./nav.js";
import { UploadPage } from "../pages/upload-page.js";
import { GamesPage } from "../pages/games-page.js";
import { StatsPage } from "../pages/stats-page.js";
import styles from "./app-shell.module.css";

export function AppShell() {
  return (
    <BrowserRouter>
      <div className={styles.shell}>
        <Nav />
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
