import os
from PIL import Image

input_dir = "frontend/public/card_images"
output_dir = "frontend/public/card_images_trimmed"

os.makedirs(output_dir, exist_ok=True)

count = 0
skipped = 0

for filename in os.listdir(input_dir):
    if not filename.lower().endswith(".png"):
        continue

    input_path = os.path.join(input_dir, filename)
    output_path = os.path.join(output_dir, filename)

    img = Image.open(input_path).convert("RGBA")
    bbox = img.getbbox()

    if bbox:
        trimmed = img.crop(bbox)
        trimmed.save(output_path)
        count += 1
        print(f"Trimmed {filename}: {img.size} -> {trimmed.size}")
    else:
        # Image is fully transparent, nothing to trim, just copy as-is
        img.save(output_path)
        skipped += 1
        print(f"Skipped {filename} (fully transparent)")

print(f"\nDone. Trimmed {count} images, skipped {skipped}.")
