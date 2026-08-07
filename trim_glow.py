import os
import numpy as np
from PIL import Image

INPUT_DIR = "frontend/public/card_images"
OUTPUT_DIR = "frontend/public/card_images_trimmed"
OPACITY_THRESHOLD = 0.65

os.makedirs(OUTPUT_DIR, exist_ok=True)

def opaque_bbox(img):
    alpha = np.array(img)[:, :, 3]
    mask = alpha >= round(OPACITY_THRESHOLD * 255)
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    if not rows.any():
        return None
    top, bottom = np.where(rows)[0][[0, -1]]
    left, right = np.where(cols)[0][[0, -1]]
    return (int(left), int(top), int(right) + 1, int(bottom) + 1)

count = 0
skipped = 0

for filename in sorted(os.listdir(INPUT_DIR)):
    is_variant = filename.startswith("Evolution ") or filename.startswith("Hero ")
    if not is_variant or not filename.lower().endswith(".png"):
        continue

    input_path = os.path.join(INPUT_DIR, filename)
    output_path = os.path.join(OUTPUT_DIR, filename)

    img = Image.open(input_path).convert("RGBA")
    bbox = opaque_bbox(img)

    if bbox:
        trimmed = img.crop(bbox)
        trimmed.save(output_path)
        count += 1
        print(f"Trimmed {filename}: {img.size} -> {trimmed.size}")
    else:
        img.save(output_path)
        skipped += 1
        print(f"Skipped {filename} (no fully-opaque pixels)")

print(f"\nDone. Trimmed {count} images, skipped {skipped}.")
