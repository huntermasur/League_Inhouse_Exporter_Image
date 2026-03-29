"""
parse_scoreboard.py
-------------------
Full end-to-end screenshot parser. Outputs a ParsedGame JSON object to stdout.

Called as a subprocess by the Node.js server.

Usage:
    python parse_scoreboard.py <screenshot_path>

Output matches the ParsedGame TypeScript interface:
  {
    "winning_team": 1 or 2,
    "players": [{ "team", "position", "username", "champion", "kills", "deaths", "assists" }],
    "bans":    [{ "team", "position", "champion" }]
  }

Team assignment:
  Players are ordered top-to-bottom on the scoreboard.
  Detected circles 0–4 → team 1, positions 1–5 (Top/Jg/Mid/Bot/Sup).
  Detected circles 5–9 → team 2, positions 1–5.

Winning team detection:
  OCR the full image for 'VICTORY'/'DEFEAT'. Whichever label sits higher on
  screen belongs to team 1. Defaults to 1 if detection is inconclusive.

Ban detection:
  For each player row, scan the rightmost strip for a circular icon using
  Hough Circle detection, then template-match against champion portraits.
  Returns "Unknown" per slot when a circle cannot be found.
"""

import json
import os
import sys
from typing import Optional

_script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _script_dir)

import cv2
import numpy as np
import pytesseract

from scoreboard_reader import (  # noqa: E402
    load_champion_icons,
    find_scoreboard_region,
    find_circles_by_param_search,
    crop_circle_from_image,
    match_champion,
    extract_player_name,
    extract_kda,
)


# ---------------------------------------------------------------------------
# Winning team
# ---------------------------------------------------------------------------

def extract_winning_team(img: np.ndarray) -> int:
    """
    OCR the full screenshot for 'VICTORY' / 'DEFEAT' text.

    Compares y-positions: whichever word sits higher on the screen belongs
    to the top team (team 1). If only one word is found its y-position is
    compared against the image midpoint. Returns 1 as a safe fallback.
    """
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = img.shape[:2]

    # Narrow the OCR region to the horizontal centre to avoid sidebar noise
    strip = img_rgb[:, w // 5 : 4 * w // 5]

    ocr_data = pytesseract.image_to_data(strip, output_type=pytesseract.Output.DICT)

    victory_y: Optional[int] = None
    defeat_y: Optional[int] = None

    for i, text in enumerate(ocr_data["text"]):
        clean = text.strip().lower()
        if not clean:
            continue
        if "victory" in clean and victory_y is None:
            victory_y = ocr_data["top"][i]
        elif "defeat" in clean and defeat_y is None:
            defeat_y = ocr_data["top"][i]

    if victory_y is not None and defeat_y is not None:
        return 1 if victory_y < defeat_y else 2

    if victory_y is not None:
        # Position relative to image midpoint decides the team
        return 1 if victory_y < h // 2 else 2

    return 1  # safe default — user can correct in the preview


# ---------------------------------------------------------------------------
# Ban detection (best-effort, per player row)
# ---------------------------------------------------------------------------

def _detect_circle_in_region(region: np.ndarray) -> Optional[tuple[int, int, int]]:
    """
    Try to detect a single small champion-icon circle inside `region`.

    Uses lenient Hough parameters with several param2 values so it works
    across screenshots with different compression levels.

    Returns (x, y, r) in region-local coordinates, or None.
    """
    rh, rw = region.shape[:2]
    if rh < 8 or rw < 8:
        return None

    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    blurred = cv2.medianBlur(gray, 3)

    min_r = max(4, min(rh, rw) // 5)
    max_r = min(30, min(rh, rw) // 2)

    for param2 in (15, 20, 25, 30, 35):
        circles = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT, dp=1,
            minDist=max(8, min_r * 2),
            param1=50, param2=param2,
            minRadius=min_r, maxRadius=max_r,
        )
        if circles is not None:
            c = np.uint16(np.around(circles[0]))
            # Pick the circle closest to the horizontal centre of the strip
            best = min(c, key=lambda ci: abs(int(ci[0]) - rw // 2))
            return int(best[0]), int(best[1]), int(best[2])

    return None


def extract_bans(
    scoreboard: np.ndarray,
    circles_sorted: np.ndarray,
    champion_icons: dict,
    ban_x_start: float = 0.84,
) -> list[dict]:
    """
    For each player row, detect and match the ban icon in the rightmost column.

    Args:
        scoreboard:      Full scoreboard BGR image.
        circles_sorted:  Player icon circles sorted top-to-bottom (N×3 array).
        champion_icons:  Pre-loaded champion icon dict.
        ban_x_start:     Fraction of scoreboard width where the ban column begins.

    Returns:
        List of dicts: [{"team": 1|2, "position": 1-5, "champion": str}]
    """
    sh, sw = scoreboard.shape[:2]
    bans = []

    for i, circle in enumerate(circles_sorted[:10]):
        _, y, r = int(circle[0]), int(circle[1]), int(circle[2])

        row_top    = max(0, y - r)
        row_bottom = min(sh, y + r)
        row        = scoreboard[row_top:row_bottom, :]

        ban_strip = row[:, int(sw * ban_x_start):]

        icon = _detect_circle_in_region(ban_strip)
        if icon is not None:
            # Ban icons are small and don't have the same coloured ring as
            # player portraits, so skip the radius shrink (1.0 = no shrink).
            ban_crop = crop_circle_from_image(ban_strip, np.array(icon, dtype=np.uint16), radius_shrink=1.0)
            champion, _ = match_champion(ban_crop, champion_icons, top_k=1)
        else:
            champion = "Unknown"

        bans.append({
            "team":     1 if i < 5 else 2,
            "position": (i % 5) + 1,
            "champion": champion,
        })

    return bans


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: parse_scoreboard.py <screenshot_path>"}))
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.isfile(image_path):
        print(json.dumps({"error": f"Image file not found: {image_path}"}))
        sys.exit(1)

    champion_images_dir = os.path.join(os.getcwd(), "data", "champion_images")
    if not os.path.isdir(champion_images_dir):
        print(json.dumps({"error": f"Champion images directory not found: {champion_images_dir}"}))
        sys.exit(1)

    champion_icons = load_champion_icons(champion_images_dir)
    if not champion_icons:
        print(json.dumps({"error": "No champion images loaded — check data/champion_images/"}))
        sys.exit(1)

    img = cv2.imread(image_path)
    if img is None:
        print(json.dumps({"error": f"Failed to read image: {image_path}"}))
        sys.exit(1)

    # ── Winning team ─────────────────────────────────────────────────────────
    winning_team = extract_winning_team(img)

    # ── Scoreboard region ────────────────────────────────────────────────────
    try:
        scoreboard = find_scoreboard_region(img)
    except ValueError as exc:
        print(json.dumps({"error": f"Could not locate scoreboard: {exc}"}))
        sys.exit(1)

    # ── Player icon circles ──────────────────────────────────────────────────
    try:
        circles = find_circles_by_param_search(scoreboard)
    except ValueError as exc:
        print(json.dumps({"error": f"Could not detect player icons: {exc}"}))
        sys.exit(1)

    circles_sorted = circles[circles[:, 1].argsort()]

    # ── Per-player extraction ────────────────────────────────────────────────
    sh = scoreboard.shape[0]
    players = []

    for i, circle in enumerate(circles_sorted):
        x, y, r = int(circle[0]), int(circle[1]), int(circle[2])

        row_top    = max(0, y - r)
        row_bottom = min(sh, y + r)
        row        = scoreboard[row_top:row_bottom, :]

        crop = crop_circle_from_image(scoreboard, circle)
        champion, _ = match_champion(crop, champion_icons, top_k=1)

        kda = extract_kda(row)

        players.append({
            "team":     1 if i < 5 else 2,
            "position": (i % 5) + 1,
            "username": extract_player_name(row, x, r),
            "champion": champion,
            "kills":    kda["kills"]   if kda["kills"]   is not None else 0,
            "deaths":   kda["deaths"]  if kda["deaths"]  is not None else 0,
            "assists":  kda["assists"] if kda["assists"]  is not None else 0,
        })

    # ── Bans (best-effort) ───────────────────────────────────────────────────
    bans = extract_bans(scoreboard, circles_sorted, champion_icons)

    print(json.dumps({
        "winning_team": winning_team,
        "players":      players,
        "bans":         bans,
    }))


if __name__ == "__main__":
    main()
