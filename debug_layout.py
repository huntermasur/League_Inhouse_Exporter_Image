"""Debug script: inspect scoreboard crop and column layout."""
import cv2
import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "server", "services"))
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

from scoreboard_reader import (
    find_scoreboard_region,
    find_circles_by_param_search,
    extract_player_name,
    extract_kda,
    LAYOUT,
)

img = cv2.imread(".copilot/references/mockups/postgame_example.png")
print(f"Full image size: {img.shape[1]}x{img.shape[0]}")

scoreboard = find_scoreboard_region(img)
sh, sw = scoreboard.shape[:2]
print(f"Scoreboard crop size: {sw}x{sh}")
cv2.imwrite("debug_scoreboard.png", scoreboard)

circles = find_circles_by_param_search(scoreboard)
circles_sorted = circles[circles[:, 1].argsort()]

print(f"\nLayout fractions applied to scoreboard width ({sw}px):")
for k, v in LAYOUT.items():
    print(f"  {k}: {v} = {int(sw * v)}px")

print(f"\nPlayer rows:")
for i, circle in enumerate(circles_sorted[:5]):  # Just first team
    x, y, r = int(circle[0]), int(circle[1]), int(circle[2])
    print(f"  Player {i}: circle at ({x},{y}) r={r}")

    row_top = max(0, y - r)
    row_bottom = min(sh, y + r)
    row = scoreboard[row_top:row_bottom, :]

    rh, rw = row.shape[:2]
    print(f"    Row size: {rw}x{rh}")

    # Save the row
    cv2.imwrite(f"debug_row_{i}.png", row)

    # Extract name region
    name_x_start = x + r + 5
    name_x_end = max(int(rw * LAYOUT["name_x_end"]), name_x_start + 20)
    name_region = row[:, name_x_start:name_x_end]
    cv2.imwrite(f"debug_name_{i}.png", name_region)

    # Extract KDA region
    kda_x_start = int(rw * LAYOUT["kda_x_start"])
    kda_x_end = int(rw * LAYOUT["kda_x_end"])
    kda_region = row[:, kda_x_start:kda_x_end]
    cv2.imwrite(f"debug_kda_{i}.png", kda_region)
    print(f"    KDA region: x={kda_x_start} to {kda_x_end}, size={kda_region.shape[1]}x{kda_region.shape[0]}")

    name = extract_player_name(row, x, r)
    kda = extract_kda(row)
    print(f"    Name: '{name}'")
    print(f"    KDA: {kda}")
