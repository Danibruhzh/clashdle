"""Loads all_cards.json into the `cards` table.

Usage (from backend/, with .venv active):
    python scripts/load_cards.py

Matches existing rows by name, so re-running is idempotent: cards already in
the table get updated in place instead of duplicated.
"""
import json
import re
import sys
from pathlib import Path

# allow `from app...` imports when this file is run directly as a script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.card import Card

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
CARDS_JSON = REPO_ROOT / "all_cards.json"

RARITY_RANK = {"Common": 1, "Rare": 2, "Epic": 3, "Legendary": 4, "Champion": 5}
CORE_CATEGORIES = [
    "Cost", "Type", "Rarity", "Target",
    "Hitpoints", "Damage", "Damage Per Second", "Special Damage",
]

LEADING_INT = re.compile(r"^\d+")


def categorize(key: str) -> str:
    """Mirrors organize_cards.py's categorize() / compareStats.ts's statCategory():
    variant keys like "Zap Target" or "Damage (Stage 3)" still belong to a base
    category."""
    if "Special Damage" in key:
        return "Special Damage"
    if "Damage Per Second" in key:
        return "Damage Per Second"
    if "Damage" in key:
        return "Damage"
    if "Cost" in key:
        return "Cost"
    if "Type" in key:
        return "Type"
    if "Rarity" in key:
        return "Rarity"
    if "Target" in key:
        return "Target"
    if "Hitpoints" in key:
        return "Hitpoints"
    return key


def pick(stats: dict, category: str):
    """Returns the value for a category, preferring an exact-name key match
    over a sub-entity variant (e.g. plain "Target" over "Zap Target")."""
    if category in stats:
        return stats[category]
    for key, value in stats.items():
        if key != "__NOTE__" and categorize(key) == category:
            return value
    return None


def split_value(value):
    """Unwraps a plain string or a {label: value} dict into (label, text)."""
    if value is None:
        return None, None
    if isinstance(value, dict):
        label, text = next(iter(value.items()))
        return label, text
    return None, value


def parse_int(text):
    if text is None or text == "N/A":
        return None
    match = LEADING_INT.match(text)
    return int(match.group()) if match else None


def clean(text):
    return text if text and text != "N/A" else None


def is_unscraped(stats: dict) -> bool:
    """True if every core stat is missing or 'N/A' (mirrors the frontend's
    hasAllStatsMissing() filter in data/cards.ts) — these are stub entries
    with no real data, not playable cards."""
    return all(stats.get(category, "N/A") == "N/A" for category in CORE_CATEGORIES)


def build_card_fields(name: str, stats: dict) -> dict:
    _, cost_text = split_value(pick(stats, "Cost"))
    _, type_text = split_value(pick(stats, "Type"))
    _, rarity_text = split_value(pick(stats, "Rarity"))
    _, target_text = split_value(pick(stats, "Target"))
    _, hp_text = split_value(pick(stats, "Hitpoints"))
    damage_label, damage_text = split_value(pick(stats, "Damage"))
    dps_label, dps_text = split_value(pick(stats, "Damage Per Second"))
    special_label, special_text = split_value(pick(stats, "Special Damage"))

    rarity = clean(rarity_text)

    return {
        "name": name,
        "cost": parse_int(cost_text),
        "type": clean(type_text),
        "rarity": rarity,
        "rarity_rank": RARITY_RANK.get(rarity),
        "target": clean(target_text),
        "hitpoints": parse_int(hp_text),
        "hitpoints_raw": clean(hp_text),
        "damage": parse_int(damage_text),
        "damage_raw": clean(damage_text),
        "damage_stage_label": damage_label,
        "dps": parse_int(dps_text),
        "dps_raw": clean(dps_text),
        "dps_stage_label": dps_label,
        "special_damage": parse_int(special_text),
        "special_damage_raw": clean(special_text),
        "special_damage_label": special_label,
    }


def main():
    with open(CARDS_JSON, encoding="utf-8") as f:
        cards_json = json.load(f)

    db = SessionLocal()
    created, updated, skipped = 0, 0, 0
    try:
        for name, stats in cards_json.items():
            if name == "__NOTE__":
                continue
            if is_unscraped(stats):
                skipped += 1
                continue

            fields = build_card_fields(name, stats)

            existing = db.query(Card).filter(Card.name == name).first()
            if existing:
                for key, value in fields.items():
                    setattr(existing, key, value)
                updated += 1
            else:
                db.add(Card(**fields))
                created += 1

        db.commit()
    finally:
        db.close()

    print(
        f"Loaded {created + updated} cards ({created} created, {updated} updated), "
        f"skipped {skipped} unscraped stub(s)."
    )


if __name__ == "__main__":
    main()
