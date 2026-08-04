"""Renames files in card_images/ so "Evolution"/"Hero" suffixes become
prefixes, and underscores become spaces (e.g. "Baby_Dragon_Evolution.png"
-> "Evolution Baby Dragon.png").
"""

import os

IMAGE_DIR = "frontend/src/card_images"

def main():
    renamed = 0
    for fname in sorted(os.listdir(IMAGE_DIR)):
        if not fname.endswith(".png"):
            continue
        name, ext = os.path.splitext(fname)

        for marker in ("Evolution", "Hero"):
            suffix = f"_{marker}"
            if name.endswith(suffix):
                name = f"{marker}_{name[: -len(suffix)]}"
                break

        new_name = name.replace("_", " ") + ext
        if new_name != fname:
            os.rename(
                os.path.join(IMAGE_DIR, fname),
                os.path.join(IMAGE_DIR, new_name),
            )
            renamed += 1

    print(f"Renamed {renamed} file(s).")

if __name__ == "__main__":
    main()
