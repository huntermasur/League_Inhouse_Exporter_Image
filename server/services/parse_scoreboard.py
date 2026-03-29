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
    load_ban_champion_icons,
    find_scoreboard_region,
    find_circles_by_param_search,
    crop_circle_from_image,
    match_champion,
    match_ban_champion,
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
# Ban detection (BANS + OBJECTIVES panel)
# ---------------------------------------------------------------------------

def _find_ban_sections(img: np.ndarray) -> list[dict]:
    """
    Use OCR to locate "BANS" header text in the full screenshot.

    Only searches the right 45 % of the image (where the BANS + OBJECTIVES
    panel lives) to speed up OCR and avoid false positives.

    Returns:
        List of position dicts ``{"x", "y", "w", "h"}`` sorted
        top-to-bottom (team 1 first).
    """
    h, w = img.shape[:2]
    x_offset = int(w * 0.55)
    right_portion = cv2.cvtColor(img[:, x_offset:], cv2.COLOR_BGR2RGB)

    ocr_data = pytesseract.image_to_data(
        right_portion, output_type=pytesseract.Output.DICT,
    )

    positions: list[dict] = []
    for i, text in enumerate(ocr_data["text"]):
        if "bans" in text.strip().lower():
            positions.append({
                "x": ocr_data["left"][i] + x_offset,
                "y": ocr_data["top"][i],
                "w": ocr_data["width"][i],
                "h": ocr_data["height"][i],
            })

    # De-duplicate: if multiple OCR hits are within ~30 px vertically
    # (e.g. "BANS" detected both as a word and as part of the full line),
    # keep the one with the wider bounding box.
    if len(positions) > 2:
        positions.sort(key=lambda p: p["y"])
        merged: list[dict] = []
        for pos in positions:
            if not merged or abs(pos["y"] - merged[-1]["y"]) > 30:
                merged.append(pos)
            elif pos["w"] > merged[-1]["w"]:
                merged[-1] = pos
        positions = merged

    positions.sort(key=lambda p: p["y"])
    return positions


def _detect_ban_icons(
    ban_region: np.ndarray,
    min_icon_dim: int = 15,
) -> list[np.ndarray]:
    """
    Detect individual ban icon crops inside a ban-section region.

    Ban icons are square with a gray diagonal-X overlay.  The function uses
    Otsu thresholding + morphological close + contour filtering to find
    square-shaped bright blobs against the dark background.

    Circular objective icons are rejected by fill-ratio filtering
    (rectangle ≈ 1.0, circle ≈ 0.785).

    Args:
        ban_region:   BGR crop of the area below a "BANS" header.
        min_icon_dim: Minimum width/height in pixels for an icon contour.

    Returns:
        List of BGR crops sorted left-to-right, top-to-bottom (max 5).
    """
    rh, rw = ban_region.shape[:2]
    if rh < 10 or rw < 10:
        return []

    gray = cv2.cvtColor(ban_region, cv2.COLOR_BGR2GRAY)

    # Otsu picks a threshold that separates bright icons from dark background.
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Horizontal-only close repairs gaps from the diagonal X slash within
    # each icon WITHOUT merging icons across rows (which are stacked in a
    # 3+2 grid with a small vertical gap).
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 1))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(
        closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
    )

    candidates: list[tuple[int, int, int, int, float]] = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w < min_icon_dim or h < min_icon_dim:
            continue

        aspect = w / h if h > 0 else 0.0
        if not (0.55 < aspect < 1.6):
            continue

        area = float(cv2.contourArea(contour))

        # Skip very small contours (noise / partial slash fragments).
        if area < 200:
            continue

        # Use bounding-rect area for size filtering — it's stable across
        # ban icons because the X slash creates inconsistent internal holes
        # that make contour area unreliable.
        rect_area = float(w * h)
        candidates.append((x, y, w, h, rect_area))

    if not candidates:
        return []

    # Keep only icons whose area is within 2.5× of the median — removes
    # stray large/small blobs (e.g. objective counters or border noise).
    areas = sorted(c[4] for c in candidates)
    median_area = areas[len(areas) // 2]
    candidates = [
        c for c in candidates
        if 0.4 * median_area < c[4] < 2.5 * median_area
    ]

    if not candidates:
        return []

    # Sort into rows then left-to-right within each row.
    heights = [c[3] for c in candidates]
    median_h = sorted(heights)[len(heights) // 2]
    candidates.sort(key=lambda c: c[1])

    rows: list[list[tuple[int, int, int, int, float]]] = []
    current_row = [candidates[0]]
    for c in candidates[1:]:
        if abs(c[1] - current_row[0][1]) < median_h * 0.7:
            current_row.append(c)
        else:
            rows.append(sorted(current_row, key=lambda c: c[0]))
            current_row = [c]
    rows.append(sorted(current_row, key=lambda c: c[0]))

    ordered = [c for row in rows for c in row]

    # Crop each icon with a small inset to exclude the dark border frame.
    crops: list[np.ndarray] = []
    for x, y, w, h, _ in ordered[:5]:
        inset = max(2, min(w, h) // 10)
        crop = ban_region[y + inset : y + h - inset, x + inset : x + w - inset]
        if crop.size > 0:
            crops.append(crop)

    return crops


def extract_bans(
    full_img: np.ndarray,
    ban_champion_icons: dict,
) -> list[dict]:
    """
    Detect banned champions from the BANS + OBJECTIVES panel.

    Works on the **full** screenshot (not the cropped scoreboard) because
    bans live in a separate panel to the right of the main player grid.

    Pipeline:
        1. OCR the right portion of the image for "BANS" text (two hits,
           one per team).
        2. Extract the region below each header.
        3. Detect ban icons via contour detection (square shapes only).
        4. Match each icon against champion portraits using overlay-aware
           template matching (``match_ban_champion``).

    Args:
        full_img:           Full screenshot, BGR.
        ban_champion_icons: Square champion icons from load_ban_champion_icons.

    Returns:
        List of dicts ``[{"team": 1|2, "position": 1-5, "champion": str}]``
        sorted by team then position.
    """
    h, w = full_img.shape[:2]
    ban_sections = _find_ban_sections(full_img)

    all_bans: list[dict] = []

    for team_idx, section in enumerate(ban_sections[:2]):
        team = team_idx + 1

        # Region below the "BANS" header containing the icon grid.
        # The grid is 3-over-2 (3 icons on top, 2 on bottom).  Use 0.17 of
        # image height to ensure the full bottom row is captured — 0.12 was
        # cutting the bottom icons short, producing truncated crops.
        region_top = section["y"] + section["h"] + 2
        region_left = max(0, section["x"] - 15)
        region_bottom = min(h, region_top + int(h * 0.17))
        region_right = min(w, region_left + int(w * 0.25))

        ban_region = full_img[region_top:region_bottom, region_left:region_right]
        icon_crops = _detect_ban_icons(ban_region)

        for pos_idx, crop in enumerate(icon_crops[:5]):
            champion, _ = match_ban_champion(crop, ban_champion_icons, top_k=1)
            all_bans.append({
                "team": team,
                "position": pos_idx + 1,
                "champion": champion,
            })

        # Fill remaining slots with "Unknown".
        for pos_idx in range(len(icon_crops), 5):
            all_bans.append({
                "team": team,
                "position": pos_idx + 1,
                "champion": "Unknown",
            })

    # If fewer than 2 team sections were found, pad with unknowns.
    existing_teams = {b["team"] for b in all_bans}
    for team in (1, 2):
        if team not in existing_teams:
            for pos in range(1, 6):
                all_bans.append({
                    "team": team,
                    "position": pos,
                    "champion": "Unknown",
                })

    return sorted(all_bans, key=lambda b: (b["team"], b["position"]))


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
    ban_champion_icons = load_ban_champion_icons(champion_images_dir)
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
    bans = extract_bans(img, ban_champion_icons)

    print(json.dumps({
        "winning_team": winning_team,
        "players":      players,
        "bans":         bans,
    }))


if __name__ == "__main__":
    main()
