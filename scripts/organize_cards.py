"""Sorts all_cards.json alphabetically by card name and reorders each
card's stats into a consistent field order. Run after manually adding
or editing entries in all_cards.json.
"""
import json
import re
from collections import defaultdict

NEST_PATTERNS = [
    (re.compile(r"^Damage \((.+)\)$"), "Damage"),
    (re.compile(r"^Damage Per Second \((.+)\)$"), "Damage Per Second"),
    (re.compile(r"^Special Damage \((.+)\)$"), "Special Damage"),
]
MULTIPLIER_PATTERN = re.compile(r"^(\d+) x(\d+) \((\d+)\)$")
NUMBER_COMMA_PATTERN = re.compile(r"(?<=\d),(?=\d)")

# Matches ONLY a primary Damage key — plain "Damage" or "Damage (Stage X)" —
# never "Special Damage ..." or "Damage Per Second ...", since those aren't
# the base damage a DPS figure should be derived from.
DAMAGE_KEY_PATTERN = re.compile(r"^Damage(?: \((.+)\))?$")
LEADING_INT_PATTERN = re.compile(r"^\d+")
LEADING_FLOAT_PATTERN = re.compile(r"^[\d.]+")

DPS_TOLERANCE = 2

CATEGORY_ORDER = [
    "__NOTE__",
    "Cost",
    "Type",
    "Rarity",
    "Target",
    "Hitpoints",
    "Damage",
    "Damage Per Second",
    "Hit Speed",
    "Special Damage",
]

# Dev-only stat, not derived from any player-facing category — see
# scraper.py and load_cards.py for where this gets scraped/loaded. Never
# add this to frontend/src/data/all_cards.json; CardDisplay.tsx renders
# every key in a card's stats generically, so anything added there is
# shown to players.
def categorize(key: str) -> int:
    if key == "__NOTE__":
        return 0
    # Checked before the generic "Damage" categories since both
    # "Special Damage" and "Damage Per Second" contain "Damage",
    # and "Special Damage (...)" variants can even contain "Target".
    if "Special Damage" in key:
        return 9
    if "Hit Speed" in key:
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

def strip_commas(text: str) -> str:
    return NUMBER_COMMA_PATTERN.sub("", text)

def parse_damage_number(value) -> int | None:
    """Extracts the total damage as an int, handling the raw pre-reformat
    multiplier shape ("64 x5 (320)" -> 320), plain numbers, and numbers
    followed by a bracketed annotation ("422 (Stage 3)" -> 422). Returns
    None for "N/A" or unparsable values."""
    if value is None or value == "N/A":
        return None
    text = strip_commas(value)
    multiplier_match = MULTIPLIER_PATTERN.match(text)
    if multiplier_match:
        return int(multiplier_match.group(3))
    leading_match = LEADING_INT_PATTERN.match(text)
    return int(leading_match.group()) if leading_match else None

def parse_hit_speed(value) -> float | None:
    """Hit Speed is stored in seconds. Returns None for "N/A" or unparsable
    values, which signals the DPS calculation should be skipped."""
    if value is None or value == "N/A":
        return None
    text = strip_commas(value)
    leading_match = LEADING_FLOAT_PATTERN.match(text)
    return float(leading_match.group()) if leading_match else None

def recalculate_dps(cards: dict) -> dict:
    """For every primary Damage stat (plain or staged), recomputes DPS from
    Damage / Hit Speed. Leaves an existing DPS value alone if it's within
    +-2 of the recalculated figure; overwrites it (or adds it, if missing)
    otherwise. Skipped entirely when the relevant Hit Speed is "N/A" or
    absent."""
    recalculated_cards = {}
    for name, stats in cards.items():
        new_stats = dict(stats)
        for key, value in stats.items():
            damage_match = DAMAGE_KEY_PATTERN.match(key)
            if not damage_match:
                continue

            damage = parse_damage_number(value)
            if damage is None:
                continue

            stage_suffix = damage_match.group(1)  # e.g. "Stage 3", or None
            hit_speed_key = f"Hit Speed ({stage_suffix})" if stage_suffix else "Hit Speed"
            hit_speed_value = stats.get(hit_speed_key, stats.get("Hit Speed"))
            hit_speed = parse_hit_speed(hit_speed_value)
            if hit_speed is None:
                continue  # "N/A" or missing Hit Speed — skip this stat

            dps_key = f"Damage Per Second ({stage_suffix})" if stage_suffix else "Damage Per Second"
            recalculated = round(damage / hit_speed)

            existing_dps = parse_damage_number(stats.get(dps_key))
            if existing_dps is None or abs(existing_dps - recalculated) > DPS_TOLERANCE:
                new_stats[dps_key] = str(recalculated)

        recalculated_cards[name] = new_stats
    return recalculated_cards

def nest_stat_variants(stats: dict) -> dict:
    restructured = {}
    for key, value in stats.items():
        for pattern, target_key in NEST_PATTERNS:
            match = pattern.match(key)
            if match:
                restructured[target_key] = {match.group(1): value}
                break
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

def strip_number_commas(stats: dict) -> dict:
    stripped = {}
    for key, value in stats.items():
        if isinstance(value, dict):
            stripped[key] = {
                sub_key: NUMBER_COMMA_PATTERN.sub("", sub_value)
                for sub_key, sub_value in value.items()
            }
        else:
            stripped[key] = NUMBER_COMMA_PATTERN.sub("", value)
    return stripped

def sort_stats(stats: dict) -> dict:
    ordered_keys = sorted(stats.keys(), key=lambda k: (categorize(k), k))
    return {key: stats[key] for key in ordered_keys}

def remove_duplicate_variants(cards: dict) -> dict:
    groups = defaultdict(list)
    for name, stats in cards.items():
        key = json.dumps(stats, sort_keys=True)
        groups[key].append(name)

    # A name is a removable variant of another name in its duplicate group
    # if it's literally "<modifier> " + that other name (e.g. "Evolution
    # Knight" / "Hero Ice Golem" / "Reborn Phoenix" all end with their base
    # card's name). The base name itself is kept.
    to_remove = set()
    for names in groups.values():
        if len(names) < 2:
            continue
        for name in names:
            for other in names:
                if other == name:
                    continue
                prefix = name[: -len(other)] if name.endswith(other) else ""
                if prefix.strip():
                    to_remove.add(name)
                    break

    return {name: stats for name, stats in cards.items() if name not in to_remove}

def tier(name: str) -> int:
    if name.startswith("Evolution "):
        return 1
    if name.startswith("Hero "):
        return 2
    return 0

def main():
    with open("all_cards.json", encoding="utf-8") as f:
        cards = json.load(f)

    recalculated_cards = recalculate_dps(cards)

    deduped_cards = remove_duplicate_variants(recalculated_cards)
    removed_count = len(recalculated_cards) - len(deduped_cards)

    ordered_names = sorted(deduped_cards, key=lambda n: (tier(n), n.lower()))
    sorted_cards = {
        name: sort_stats(
            reformat_damage_values(
                nest_stat_variants(strip_number_commas(deduped_cards[name]))
            )
        )
        for name in ordered_names
    }

    # with open("./frontend/src/data/all_cards.json", "w", encoding="utf-8") as f:
    #     json.dump(sorted_cards, f, indent=2)
    #     f.write("\n")

    with open("all_cards.json", "w", encoding="utf-8") as f:
        json.dump(sorted_cards, f, indent=2)
        f.write("\n")

    print(f"Organized {len(sorted_cards)} cards. Removed {removed_count} duplicate variant(s).")

if __name__ == "__main__":
    main()