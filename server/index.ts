import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

// Serve uploaded game screenshots
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "data", "uploads")),
);

// Serve champion icon images
app.use(
  "/champion-images",
  express.static(path.join(__dirname, "..", "data", "champion_images")),
);

app.use("/api", apiRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
