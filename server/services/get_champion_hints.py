"""
get_champion_hints.py
---------------------
Thin wrapper around scoreboard_reader.py called as a subprocess from Node.js.

Usage:
    python get_champion_hints.py <screenshot_path>

Outputs a JSON array to stdout — one entry per detected player row (sorted
top-to-bottom), each containing the top template-matching candidates:

    [
      {
        "row_index": 0,
        "top_matches": [["Jinx", 0.87], ["Caitlyn", 0.74], ...]
      },
      ...
    ]

Errors are reported as: {"error": "<message>"}
Exit code is non-zero on failure.
"""

import json
import os
import sys

# Resolve the directory so imports work regardless of CWD
_script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _script_dir)

from scoreboard_reader import load_champion_icons, identify_champions  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: get_champion_hints.py <screenshot_path>"}))
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.isfile(image_path):
        print(json.dumps({"error": f"Image file not found: {image_path}"}))
        sys.exit(1)

    # Champion images are expected at <project_root>/data/champion_images/
    # CWD is set to the project root by python-bridge.ts
    champion_images_dir = os.path.join(os.getcwd(), "data", "champion_images")

    if not os.path.isdir(champion_images_dir):
        print(json.dumps({"error": f"Champion images directory not found: {champion_images_dir}"}))
        sys.exit(1)

    champion_icons = load_champion_icons(champion_images_dir)

    if not champion_icons:
        print(json.dumps({"error": "No champion images loaded — check data/champion_images/"}))
        sys.exit(1)

    results = identify_champions(image_path, champion_icons)

    output = [
        {
            "row_index": i,
            "top_matches": result["top_matches"],
        }
        for i, result in enumerate(results)
    ]

    print(json.dumps(output))


if __name__ == "__main__":
    main()
