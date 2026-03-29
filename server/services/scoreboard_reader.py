"""
scoreboard_reader.py
--------------------
Identifies League of Legends champions from a scoreboard screenshot using
OCR, Hough circle detection, and template matching.

Pipeline:
    1. find_scoreboard_region       – OCR to locate and crop the scoreboard area
    2. find_circles_by_param_search – detect champion icon circles
    3. match_champion               – match each circle to a champion portrait
    4. extract_player_name          – OCR the player name for a row
    5. extract_kda                  – OCR the K/D/A for a row
    6. extract_items                – template-match item icons for a row
    7. read_scoreboard              – full pipeline returning all player data
    8. identify_champions           – legacy alias (champions only)
"""

import os
import re
from itertools import product
from typing import Optional

import cv2
import numpy as np
import pytesseract

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

CHAMPION_IMAGES_DIR = "data/champion_images"
ITEM_IMAGES_DIR     = "data/item_images"

ICON_RING_COLOR = (255, 140, 0)  # orange (RGB)
ICON_RING_THICKNESS = 4

# Number of item slots per player row (6 items + 1 trinket)
ITEM_SLOTS = 7

# Column layout as fractions of the scoreboard width.
# Adjust these if your screenshots have a different aspect ratio.
LAYOUT: dict[str, float] = {
    "name_x_end":    0.34,   # player name ends here
    "items_x_start": 0.34,   # item icons start here
    "items_x_end":   0.68,   # item icons end here
    "kda_x_start":   0.68,   # K/D/A column starts here
    "kda_x_end":     0.83,   # K/D/A column ends here
}

# Parameter grid for the Hough circle brute-force search
HOUGH_PARAM_GRID: dict[str, range] = {
    "min_dist":  range(20, 30, 5),
    "param1":    range(50, 100, 10),
    "param2":    range(20, 80, 10),
    "minRadius": range(5, 20, 5),
    "maxRadius": range(20, 40, 5),
}

# Stop early once this many exact-count solutions are found
EARLY_STOP_COUNT = 30

# Expected number of champion icons in one scoreboard (10 players)
EXPECTED_CIRCLE_COUNT = 10

# Both the screenshot crop and the template are resized to this canonical square
# before matching.  Larger = more detail but slower; 64 is a good trade-off.
# This eliminates errors caused by imprecise Hough radius detection.
MATCH_SIZE = 64

# Fraction of the detected Hough radius to keep when cropping a champion icon.
# The in-game scoreboard draws a coloured border ring (gold/blue/red) around
# each portrait.  Shrinking the crop radius excludes those ring pixels so they
# don't pollute template matching against ring-free Data Dragon portraits.
CROP_RADIUS_SHRINK = 0.88

# Canonical width (pixels) that the scoreboard region is resized to before
# circle detection.  Normalising resolution makes the fixed Hough parameter
# grid work across 1080p, 1440p, 4K, and windowed-mode screenshots.
CANONICAL_SCOREBOARD_WIDTH = 1200

# Data Dragon portraits are square, but the in-game scoreboard zooms/crops
# them into a tighter circle.  This fraction controls how much of the
# template centre to keep, mimicking the game's zoom level.
TEMPLATE_CENTER_CROP = 0.85


# ---------------------------------------------------------------------------
# Icon helpers
# ---------------------------------------------------------------------------

def create_circular_icon(
    path: str,
    ring_color: tuple[int, int, int] = ICON_RING_COLOR,
    ring_thickness: int = 0,
    center_crop_frac: float = TEMPLATE_CENTER_CROP,
) -> np.ndarray:
    """
    Load a champion portrait and return it as an RGB circle.

    ring_thickness defaults to 0 (no ring) because the in-game scoreboard
    uses team-coloured rings (blue/red) that differ from any hardcoded colour,
    so adding a ring to templates actively hurts template-matching accuracy.
    Pass ring_thickness > 0 only for visualisation purposes.

    center_crop_frac controls how much of the portrait centre to keep before
    masking to a circle.  The in-game scoreboard zooms champion icons tighter
    than the full Data Dragon square, so cropping the outer edges of the
    template reduces mismatch from portrait content the game never shows.

    Args:
        path:             Path to the champion .png file.
        ring_color:       RGB tuple for the border ring (ignored when thickness=0).
        ring_thickness:   Pixel width of the border ring (0 = no ring).
        center_crop_frac: Fraction of the image to keep (0.85 = inner 85%).

    Returns:
        H×W×3 uint8 array (RGB).
    """
    img = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB)
    h, w = img.shape[:2]

    # Centre-crop the square portrait to approximate the in-game zoom level.
    if center_crop_frac < 1.0:
        margin_y = int(h * (1.0 - center_crop_frac) / 2)
        margin_x = int(w * (1.0 - center_crop_frac) / 2)
        img = img[margin_y:h - margin_y, margin_x:w - margin_x].copy()
        h, w = img.shape[:2]

    center = (w // 2, h // 2)
    radius = min(h, w) // 2

    # Mask pixels outside the circle to black
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(mask, center, radius, 255, thickness=-1)
    circular = np.zeros_like(img)
    circular[mask == 255] = img[mask == 255]

    # Draw the border ring
    ring_bgr = ring_color[::-1]  # RGB → BGR for OpenCV
    circular_bgr = cv2.cvtColor(circular, cv2.COLOR_RGB2BGR)
    cv2.circle(
        circular_bgr, center,
        radius - ring_thickness // 2,
        ring_bgr, ring_thickness,
        lineType=cv2.LINE_AA,
    )

    return cv2.cvtColor(circular_bgr, cv2.COLOR_BGR2RGB)


def load_champion_icons(directory: str = CHAMPION_IMAGES_DIR) -> dict[str, np.ndarray]:
    """
    Load every champion portrait from `directory` as a circular RGB icon.

    Returns:
        Dict mapping champion name → H×W×3 uint8 array (RGB).
    """
    icons = {}
    for filename in os.listdir(directory):
        if filename.endswith(".png"):
            name = os.path.splitext(filename)[0]
            icons[name] = create_circular_icon(os.path.join(directory, filename))
    return icons


# ---------------------------------------------------------------------------
# Scoreboard detection
# ---------------------------------------------------------------------------

def find_scoreboard_region(img: np.ndarray, padding: int = 5) -> np.ndarray:
    """
    Use pytesseract to locate the 'Scoreboard' header and return the image
    region below it (where champion icons appear).

    Args:
        img:     BGR image array (as returned by cv2.imread).
        padding: Extra pixels to skip below the detected text box.

    Returns:
        Cropped BGR array containing only the scoreboard body.

    Raises:
        ValueError: If 'Scoreboard' text is not found.
    """
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    ocr_data = pytesseract.image_to_data(img_rgb, output_type=pytesseract.Output.DICT)

    scoreboard_y: Optional[int] = None
    for i, text in enumerate(ocr_data["text"]):
        if "scoreboard" in text.lower():
            y = ocr_data["top"][i]
            h_text = ocr_data["height"][i]
            scoreboard_y = y + h_text + padding
            break

    if scoreboard_y is None:
        raise ValueError("Could not locate 'Scoreboard' text in the image.")

    cropped = img[scoreboard_y:, :]

    # Detect the right boundary of the scoreboard area to exclude side
    # panels (e.g. the Social/Friends list).  The scoreboard sits on a
    # darker background; we look for a vertical brightness edge in the
    # upper portion of the cropped region.
    probe_h = min(60, cropped.shape[0])
    probe_strip = cv2.cvtColor(cropped[:probe_h, :], cv2.COLOR_BGR2GRAY)
    col_brightness = np.mean(probe_strip, axis=0)

    # Walk from the right edge inward until brightness rises above the
    # dark-background threshold — that marks the scoreboard boundary.
    # If the entire strip is fairly uniform (no side panel), keep full width.
    right_edge = cropped.shape[1]
    threshold = np.mean(col_brightness) * 0.45
    for col_x in range(len(col_brightness) - 1, int(len(col_brightness) * 0.6), -1):
        if col_brightness[col_x] > threshold and col_brightness[col_x - 1] < threshold:
            right_edge = col_x
            break

    return cropped[:, :right_edge]


# ---------------------------------------------------------------------------
# Circle detection
# ---------------------------------------------------------------------------

def detect_circles(
    img: np.ndarray,
    min_dist: int = 200,
    param1: int = 100,
    param2: int = 100,
    minRadius: int = 0,
    maxRadius: int = 0,
) -> np.ndarray:
    """
    Run the Hough Circle Transform on `img` with the given parameters.

    Returns:
        Array of shape (N, 3) — each row is (x, y, radius).

    Raises:
        ValueError: If no circles are detected.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.medianBlur(gray, 5)

    circles = cv2.HoughCircles(
        blurred, cv2.HOUGH_GRADIENT, dp=1,
        minDist=min_dist, param1=param1, param2=param2,
        minRadius=minRadius, maxRadius=maxRadius,
    )

    if circles is None:
        raise ValueError("No circles detected with the given parameters.")

    return np.uint16(np.around(circles[0]))  # (N, 3)


def _most_uniform_group(groups: list[np.ndarray]) -> np.ndarray:
    """
    Return the circle group whose horizontal positions and radii are
    most consistent (lowest weighted variance across x and r columns).
    """
    scores = []
    for group in groups:
        # Normalise per-axis so scale differences don't dominate
        normalised = group - np.mean(group, axis=0)
        variance = np.var(normalised[:, [0, 2]], axis=0)  # cols: x, radius
        scores.append(float(np.sum(variance)))
    return groups[int(np.argmin(scores))]


def find_circles_by_param_search(
    img: np.ndarray,
    param_grid: dict[str, range] = HOUGH_PARAM_GRID,
    target_count: int = EXPECTED_CIRCLE_COUNT,
    early_stop: int = EARLY_STOP_COUNT,
    canonical_width: int = CANONICAL_SCOREBOARD_WIDTH,
) -> np.ndarray:
    """
    Brute-force Hough parameters to reliably find `target_count` circles.

    The image is first resized to `canonical_width` so the fixed Hough
    parameter grid works across any input resolution (1080p, 1440p, 4K,
    windowed mode, etc.).  Detected circles are then scaled back to the
    original pixel space.

    Iterates over every combination in `param_grid`, collects runs that
    returned the right number of circles, then picks the most geometrically
    uniform group (consistent x-positions and radii).

    Args:
        img:             BGR image to search.
        param_grid:      Dict of parameter name → range of values to try.
        target_count:    Expected number of circles (default: 10 players).
        early_stop:      Return early once this many exact-count solutions exist.
        canonical_width: Width to normalise the image to before detection.

    Returns:
        Array of shape (target_count, 3) — (x, y, radius) per circle,
        in the coordinate space of the *original* image.

    Raises:
        ValueError: If no valid configuration is found.
    """
    orig_h, orig_w = img.shape[:2]
    scale = orig_w / canonical_width
    canonical_h = int(orig_h / scale)
    search_img = cv2.resize(
        img, (canonical_width, canonical_h), interpolation=cv2.INTER_AREA
    )

    all_combinations = [
        dict(zip(param_grid, values))
        for values in product(*param_grid.values())
    ]

    exact_matches: list[np.ndarray] = []
    loose_matches: list[np.ndarray] = []

    for params in all_combinations:
        try:
            circles = detect_circles(search_img, **params)
        except ValueError:
            continue

        n = len(circles)
        if n == target_count:
            exact_matches.append(circles)
            if len(exact_matches) >= early_stop:
                break
        elif target_count < n <= target_count * 2:
            loose_matches.append(circles)

    candidates = exact_matches or loose_matches
    if not candidates:
        raise ValueError(
            f"Could not find {target_count} circles in any parameter combination."
        )

    best = _most_uniform_group(candidates)

    # Scale circle coordinates back to original image resolution.
    scaled = np.float64(best) * scale
    return np.uint16(np.around(scaled))


# ---------------------------------------------------------------------------
# Champion matching
# ---------------------------------------------------------------------------

def _apply_circular_mask(img: np.ndarray) -> np.ndarray:
    """
    Zero out all pixels outside the largest inscribed circle of `img`.

    Works on both grayscale (H×W) and color (H×W×C) arrays.
    Returns a copy with corners blacked out.
    """
    h, w = img.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(mask, (w // 2, h // 2), min(h, w) // 2, 255, thickness=-1)
    out = img.copy()
    out[mask == 0] = 0   # works for both (H,W) and (H,W,C)
    return out


def crop_circle_from_image(
    img: np.ndarray,
    circle: np.ndarray,
    radius_shrink: float = CROP_RADIUS_SHRINK,
) -> np.ndarray:
    """
    Crop the bounding square of a detected circle from `img`, then zero out
    the corners outside the circle so background pixels don't influence matching.

    The crop radius is shrunk by `radius_shrink` (default 0.88) to exclude the
    coloured border ring that the in-game scoreboard draws around each icon.

    Coordinates are clamped to image bounds so edge players don't produce
    undersized or empty crops.

    Returns:
        BGR uint8 array of size (2r' × 2r') with corners masked to black.
    """
    x, y, r = int(circle[0]), int(circle[1]), int(circle[2])
    r = max(1, int(r * radius_shrink))

    ih, iw = img.shape[:2]
    y1 = max(0, y - r)
    y2 = min(ih, y + r)
    x1 = max(0, x - r)
    x2 = min(iw, x + r)

    crop = img[y1:y2, x1:x2].copy()

    # If edge clamping produced a non-square crop, pad with black to restore
    # the expected (2r × 2r) size so the circular mask aligns correctly.
    ch, cw = crop.shape[:2]
    target = 2 * r
    if ch != target or cw != target:
        padded = np.zeros((target, target, 3), dtype=np.uint8) if crop.ndim == 3 \
            else np.zeros((target, target), dtype=np.uint8)
        # Offset = how many pixels were clipped on the top / left side.
        # Place the crop at that offset so the portrait content stays centred.
        oy = y1 - (y - r)  # >0 when top was clamped
        ox = x1 - (x - r)  # >0 when left was clamped
        padded[oy:oy + ch, ox:ox + cw] = crop
        crop = padded

    return _apply_circular_mask(crop)


def match_champion(
    circle_crop: np.ndarray,
    champion_icons: dict[str, np.ndarray],
    top_k: int = 5,
) -> tuple[str, list[tuple[str, float]]]:
    """
    Score `circle_crop` against every champion icon using a blend of two
    complementary signals:

    1. Normalised cross-correlation (NCC) of the full BGR image — captures
       fine spatial detail and texture.
    2. HSV colour-histogram correlation — robust to slight position/scale
       errors that break pixel-level NCC; champions have very distinctive
       colour palettes that survive compression and screenshot variation.

    Both the crop and each template are resized to MATCH_SIZE × MATCH_SIZE
    before comparison, eliminating errors from imprecise Hough radius
    detection (the detected radius may be a few pixels off the true edge).

    Args:
        circle_crop:     BGR color crop from the scoreboard (corners masked).
        champion_icons:  Dict mapping name → RGB icon (from load_champion_icons).
        top_k:           Number of top candidates to return.

    Returns:
        (best_match_name, [(name, score), ...]) sorted descending by score.
    """
    # Normalise the screenshot crop to canonical size and re-apply mask so
    # corner pixels (which are black) don't skew histogram buckets.
    canonical = cv2.resize(
        circle_crop, (MATCH_SIZE, MATCH_SIZE), interpolation=cv2.INTER_AREA
    )
    canonical = _apply_circular_mask(canonical)

    # Build a mask covering the circular area (non-black pixels).
    crop_gray = cv2.cvtColor(canonical, cv2.COLOR_BGR2GRAY)
    _, crop_mask = cv2.threshold(crop_gray, 5, 255, cv2.THRESH_BINARY)

    canonical_hsv = cv2.cvtColor(canonical, cv2.COLOR_BGR2HSV)

    # Detect whether the crop is greyscale (dead champion) by checking
    # saturation.  If the icon is desaturated, boost the NCC weight
    # because the colour histogram becomes unreliable.
    mean_saturation = float(cv2.mean(canonical_hsv[:, :, 1], mask=crop_mask)[0])
    is_greyscale = mean_saturation < 25  # dead champions have near-zero saturation

    ncc_weight = 0.80 if is_greyscale else 0.55
    hist_weight = 1.0 - ncc_weight

    # Correct histogram ranges per HSV channel:
    # OpenCV uses H: 0-179, S: 0-255, V: 0-255
    channel_ranges: list[list[float]] = [[0, 180], [0, 256], [0, 256]]

    scores: dict[str, float] = {}

    for name, icon_rgb in champion_icons.items():
        # Icons are stored as RGB; convert to BGR to match the scoreboard crop.
        icon_bgr = cv2.cvtColor(icon_rgb, cv2.COLOR_RGB2BGR)
        template = cv2.resize(
            icon_bgr, (MATCH_SIZE, MATCH_SIZE), interpolation=cv2.INTER_AREA
        )
        template = _apply_circular_mask(template)

        # ── 1. Normalised cross-correlation ──────────────────────────────────
        # When the crop is greyscale (dead champion), convert the template to
        # greyscale too so NCC compares luminance patterns without colour bias.
        if is_greyscale:
            crop_gray_ncc = cv2.cvtColor(canonical, cv2.COLOR_BGR2GRAY)
            tmpl_gray_ncc = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
            ncc = float(cv2.matchTemplate(crop_gray_ncc, tmpl_gray_ncc, cv2.TM_CCOEFF_NORMED)[0][0])
        else:
            ncc = float(cv2.matchTemplate(canonical, template, cv2.TM_CCOEFF_NORMED)[0][0])

        # ── 2. HSV histogram correlation ─────────────────────────────────────
        template_hsv = cv2.cvtColor(template, cv2.COLOR_BGR2HSV)
        tmpl_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
        _, tmpl_mask = cv2.threshold(tmpl_gray, 5, 255, cv2.THRESH_BINARY)
        shared_mask = cv2.bitwise_and(crop_mask, tmpl_mask)

        hist_score = 0.0
        # H (hue) gets more bins — it's the most discriminative channel.
        channel_bins = [16, 8, 8]  # H, S, V
        for ch, bins in enumerate(channel_bins):
            h1 = cv2.calcHist([canonical_hsv], [ch], shared_mask, [bins], channel_ranges[ch])
            h2 = cv2.calcHist([template_hsv],  [ch], shared_mask, [bins], channel_ranges[ch])
            cv2.normalize(h1, h1)
            cv2.normalize(h2, h2)
            hist_score += cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL)
        hist_score /= len(channel_bins)  # normalise to [-1, 1]

        # Weighted blend: NCC is precise when alignment is good; histogram
        # provides a stable signal when pixel alignment is slightly off.
        # For greyscale (dead) icons, NCC gets more weight since colour is absent.
        scores[name] = ncc_weight * ncc + hist_weight * hist_score

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    return ranked[0][0], ranked[:top_k]


# ---------------------------------------------------------------------------
# OCR helpers – player name & KDA
# ---------------------------------------------------------------------------

def preprocess_for_ocr(region: np.ndarray, scale: int = 3) -> np.ndarray:
    """
    Upscale and threshold a BGR (or grayscale) region so pytesseract handles
    white-on-dark scoreboard text reliably.

    Args:
        region: BGR or grayscale crop from the scoreboard.
        scale:  Integer upscale factor (higher = slower but more accurate).

    Returns:
        Thresholded grayscale uint8 array.
    """
    h, w = region.shape[:2]
    large = cv2.resize(region, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(large, cv2.COLOR_BGR2GRAY) if large.ndim == 3 else large
    _, thresh = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY)
    return thresh


def extract_player_name(row: np.ndarray, icon_x: int, icon_r: int) -> str:
    """
    OCR the player-name column from a single player row.

    The name sits between the right edge of the champion icon and
    LAYOUT["name_x_end"] * row_width.

    Args:
        row:    Full-width BGR crop of the player row.
        icon_x: X centre of the detected champion-icon circle.
        icon_r: Radius of the detected champion-icon circle.

    Returns:
        Stripped player name string (may be empty if OCR fails).
    """
    x_start = icon_x + icon_r + 5
    x_end   = max(int(row.shape[1] * LAYOUT["name_x_end"]), x_start + 20)
    region  = row[:, x_start:x_end]
    processed = preprocess_for_ocr(region)
    raw = pytesseract.image_to_string(processed, config="--psm 7 --oem 3")
    return raw.strip()


def extract_kda(row: np.ndarray) -> dict[str, Optional[int]]:
    """
    OCR the K/D/A column from a single player row.

    Parses text like "9 / 4 / 15" into kills, deaths, assists.

    Args:
        row: Full-width BGR crop of the player row.

    Returns:
        Dict with keys "kills", "deaths", "assists" (int or None if OCR fails).
    """
    w = row.shape[1]
    region    = row[:, int(w * LAYOUT["kda_x_start"]):int(w * LAYOUT["kda_x_end"])]
    processed = preprocess_for_ocr(region)
    raw = pytesseract.image_to_string(
        processed,
        config="--psm 7 --oem 3 -c tessedit_char_whitelist=0123456789/ ",
    )
    numbers = re.findall(r"\d+", raw)
    if len(numbers) >= 3:
        return {
            "kills":   int(numbers[0]),
            "deaths":  int(numbers[1]),
            "assists": int(numbers[2]),
        }
    return {"kills": None, "deaths": None, "assists": None}


# ---------------------------------------------------------------------------
# Item helpers
# ---------------------------------------------------------------------------

def load_item_icons(directory: str = ITEM_IMAGES_DIR) -> dict[str, np.ndarray]:
    """
    Load every item portrait from `directory` as a grayscale array.

    Returns:
        Dict mapping item ID (filename stem) → H×W uint8 grayscale array.
    """
    icons: dict[str, np.ndarray] = {}
    for filename in os.listdir(directory):
        if filename.endswith(".png"):
            item_id = os.path.splitext(filename)[0]
            img = cv2.imread(os.path.join(directory, filename), cv2.IMREAD_GRAYSCALE)
            if img is not None:
                icons[item_id] = img
    return icons


def _slot_is_empty(slot: np.ndarray, brightness_threshold: int = 15) -> bool:
    """Return True if a slot crop is too dark to contain an item icon."""
    gray = cv2.cvtColor(slot, cv2.COLOR_BGR2GRAY) if slot.ndim == 3 else slot
    return float(np.mean(gray)) < brightness_threshold


def match_item(
    slot_crop: np.ndarray,
    item_icons: dict[str, np.ndarray],
) -> Optional[str]:
    """
    Match a single item slot crop against all known item icons via
    normalised cross-correlation template matching.

    Args:
        slot_crop:  BGR or grayscale crop of one item slot.
        item_icons: Dict from load_item_icons().

    Returns:
        Best-matching item ID string, or None if the slot is empty.
    """
    if _slot_is_empty(slot_crop):
        return None

    gray = cv2.cvtColor(slot_crop, cv2.COLOR_BGR2GRAY) if slot_crop.ndim == 3 else slot_crop
    h, w = gray.shape[:2]
    best_name:  Optional[str] = None
    best_score: float         = -1.0

    for item_id, icon in item_icons.items():
        resized = cv2.resize(icon, (w, h), interpolation=cv2.INTER_AREA)
        score   = float(cv2.matchTemplate(gray, resized, cv2.TM_CCOEFF_NORMED)[0][0])
        if score > best_score:
            best_score = score
            best_name  = item_id

    return best_name


def extract_items(
    row: np.ndarray,
    item_icons: dict[str, np.ndarray],
    n_slots: int = ITEM_SLOTS,
) -> list[Optional[str]]:
    """
    Divide the items column into `n_slots` equal slots and match each one.

    Args:
        row:        Full-width BGR crop of the player row.
        item_icons: Dict from load_item_icons().
        n_slots:    Number of item slots to expect (default 7: 6 items + trinket).

    Returns:
        List of item IDs (or None for empty slots), length == n_slots.
    """
    w       = row.shape[1]
    x_start = int(w * LAYOUT["items_x_start"])
    x_end   = int(w * LAYOUT["items_x_end"])
    region  = row[:, x_start:x_end]
    slot_w  = (x_end - x_start) // n_slots

    return [
        match_item(region[:, i * slot_w: (i + 1) * slot_w], item_icons)
        for i in range(n_slots)
    ]


# ---------------------------------------------------------------------------
# Visualisation helpers
# ---------------------------------------------------------------------------

def draw_circles(
    img: np.ndarray,
    circles: np.ndarray,
    color: tuple[int, int, int] = (255, 255, 0),
    thickness: int = 2,
) -> np.ndarray:
    """Return a copy of `img` (BGR) with circles drawn on it."""
    out = img.copy()
    for x, y, r in circles:
        cv2.circle(out, (int(x), int(y)), int(r), color, thickness)
    return out


# ---------------------------------------------------------------------------
# Full pipeline
# ---------------------------------------------------------------------------

def read_scoreboard(
    screenshot_path: str,
    champion_icons: dict[str, np.ndarray],
    item_icons: Optional[dict[str, np.ndarray]] = None,
) -> list[dict]:
    """
    End-to-end pipeline: screenshot → list of per-player data dicts.

    Reads champion identity, player name, K/D/A, and (optionally) items
    for all 10 players, sorted top-to-bottom.

    Args:
        screenshot_path: Path to the game screenshot.
        champion_icons:  Pre-loaded champion icons (call load_champion_icons() once).
        item_icons:      Pre-loaded item icons (call load_item_icons() once).
                         Pass None to skip item identification.

    Returns:
        List of dicts, one per player, sorted top-to-bottom:
            {
                "player_name": str,
                "champion":    str,
                "kda":         {"kills": int, "deaths": int, "assists": int},
                "items":       [item_id_or_None, ...]   # only if item_icons provided
                "circle":      [x, y, r],
                "top_matches": [(champion_name, score), ...]
            }
    """
    img       = cv2.imread(screenshot_path)
    scoreboard = find_scoreboard_region(img)
    circles    = find_circles_by_param_search(scoreboard)
    circles_sorted = circles[circles[:, 1].argsort()]

    results = []
    for circle in circles_sorted:
        x, y, r = int(circle[0]), int(circle[1]), int(circle[2])

        # Crop the full-width row for this player
        row_top    = max(0, y - r)
        row_bottom = min(scoreboard.shape[0], y + r)
        row        = scoreboard[row_top:row_bottom, :]

        # Champion
        crop = crop_circle_from_image(scoreboard, circle)
        champion, top_matches = match_champion(crop, champion_icons)

        entry: dict = {
            "player_name": extract_player_name(row, x, r),
            "champion":    champion,
            "kda":         extract_kda(row),
            "circle":      circle.tolist(),
            "top_matches": top_matches,
        }

        if item_icons is not None:
            entry["items"] = extract_items(row, item_icons)

        results.append(entry)

    return results


def identify_champions(
    screenshot_path: str,
    champion_icons: dict[str, np.ndarray],
) -> list[dict]:
    """
    End-to-end pipeline: screenshot → list of identified champions.

    Args:
        screenshot_path: Path to the game screenshot.
        champion_icons:  Pre-loaded icons (call load_champion_icons() once).

    Returns:
        List of dicts, one per detected icon, sorted top-to-bottom:
            {
                "champion":    str,
                "circle":      [x, y, r],
                "top_matches": [(name, score), ...]
            }
    """
    img = cv2.imread(screenshot_path)

    scoreboard = find_scoreboard_region(img)
    circles = find_circles_by_param_search(scoreboard)
    circles_top_to_bottom = circles[circles[:, 1].argsort()]

    results = []
    for circle in circles_top_to_bottom:
        crop = crop_circle_from_image(scoreboard, circle)
        champion, top_matches = match_champion(crop, champion_icons)
        results.append({
            "champion":    champion,
            "circle":      circle.tolist(),
            "top_matches": top_matches,
        })

    return results
