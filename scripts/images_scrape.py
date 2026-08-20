import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("CLASH_ROYALE_API_KEY")

headers = {"Authorization": f"Bearer {API_KEY}"}
response = requests.get("https://api.clashroyale.com/v1/cards", headers=headers)
response.raise_for_status()

data = response.json()
cards = data["items"] + data["supportItems"]

output_dir = "card_images"
os.makedirs(output_dir, exist_ok=True)

variant_suffixes = {
    "medium": "",
    "evolutionMedium": "_evo",
    "heroMedium": "_hero"
}

count = 0
for card in cards:
    name = card["name"].replace(" ", "_").replace(".", "")
    icons = card["iconUrls"]

    for key, suffix in variant_suffixes.items():
        if key in icons:
            img_data = requests.get(icons[key]).content
            filename = f"{name}{suffix}.png"

            with open(os.path.join(output_dir, filename), "wb") as f:
                f.write(img_data)

            print(f"Saved {filename}")
            count += 1
    
    print(f"Saved {filename}")

print("done")