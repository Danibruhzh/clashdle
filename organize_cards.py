"""Sorts all_cards.json alphabetically by card name and reorders each
card's stats into a consistent field order. Run after manually adding
or editing entries in all_cards.json.
"""
import json
import re

SPECIAL_DAMAGE_PATTERN = re.compile(r"^Special Damage \((.+)\)$")
MULTIPLIER_PATTERN = re.compile(r"^(\d+) x(\d+) \((\d+)\)$")

CATEGORY_ORDER = [
    "__NOTE__",
    "Cost",
    "Type",
    "Rarity",
    "Target",
    "Hitpoints",
    "Damage",
    "Damage Per Second",
    "Special Damage",
]

def categorize(key: str) -> int:
    if key == "__NOTE__":
        return 0
    # Checked before the generic "Damage" categories since both
    # "Special Damage" and "Damage Per Second" contain "Damage",
    # and "Special Damage (...)" variants can even contain "Target".
    if "Special Damage" in key:
        return 8
    if "Damage Per Second" in key:
        return 7
    if "Damage" in key:
        return 6
    if "Cost" in key:
        return 1
    if "Type" in key:
        return 2
    if "Rarity" in key:
        return 3
    if "Target" in key:
        return 4
    if "Hitpoints" in key:
        return 5
    return len(CATEGORY_ORDER)

def nest_special_damage(stats: dict) -> dict:
    restructured = {}
    for key, value in stats.items():
        match = SPECIAL_DAMAGE_PATTERN.match(key)
        if match:
            restructured["Special Damage"] = {match.group(1): value}
        else:
            restructured[key] = value
    return restructured

def reformat_multiplier(value: str) -> str:
    match = MULTIPLIER_PATTERN.match(value)
    if not match:
        return value
    single, count, total = match.groups()
    return f"{total} ({single} x{count})"

def is_damage_key(key: str) -> bool:
    return "Damage" in key and "Per Second" not in key

def reformat_damage_values(stats: dict) -> dict:
    reformatted = {}
    for key, value in stats.items():
        if not is_damage_key(key):
            reformatted[key] = value
        elif isinstance(value, dict):
            reformatted[key] = {
                sub_key: reformat_multiplier(sub_value)
                for sub_key, sub_value in value.items()
            }
        else:
            reformatted[key] = reformat_multiplier(value)
    return reformatted

def sort_stats(stats: dict) -> dict:
    ordered_keys = sorted(stats.keys(), key=lambda k: (categorize(k), k))
    return {key: stats[key] for key in ordered_keys}

def tier(name: str) -> int:
    if name.startswith("Evolution "):
        return 1
    if name.startswith("Hero "):
        return 2
    return 0

def main():
    with open("all_cards.json", encoding="utf-8") as f:
        cards = json.load(f)

    ordered_names = sorted(cards, key=lambda n: (tier(n), n.lower()))
    sorted_cards = {
        name: sort_stats(reformat_damage_values(nest_special_damage(cards[name])))
        for name in ordered_names
    }

    with open("all_cards.json", "w", encoding="utf-8") as f:
        json.dump(sorted_cards, f, indent=2)
        f.write("\n")

    print(f"Organized {len(sorted_cards)} cards.")

if __name__ == "__main__":
    main()