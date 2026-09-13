"""Loads all_cards.json into the `cards` table.

Usage (from backend/, with .venv active):
    python scripts/load_cards.py

Matches existing rows by name, so re-running is idempotent: cards already in
the table get updated in place instead of duplicated (same card_id, only
fields change).

Also syncs answer_pool and daily_answers:
- Any card (new or existing) missing from BOTH answer_pool and
  daily_answers gets added to answer_pool at the current cycle_number,
  since it hasn't been a daily answer yet and isn't currently eligible
  to become one.
- Cards removed from all_cards.json are deleted from cards and answer_pool,
  UNLESS they have a daily_answers row (past daily answer history), in
  which case they're left alone entirely so that history is never lost.
"""
import json
import re
import sys
from pathlib import Path

# allow `from app...` imports when this file is run directly as a script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func

from app.db.session import SessionLocal
from app.models.card import Card
from app.models.answer_pool import AnswerPool
from app.models.daily_answer import DailyAnswer

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
CARDS_JSON = REPO_ROOT / "all_cards.json"

RARITY_RANK = {"Common": 1, "Rare": 2, "Epic": 3, "Legendary": 4, "Champion": 5}
CORE_CATEGORIES = [
    "Cost", "Type", "Rarity", "Target",
    "Hitpoints", "Damage", "Damage Per Second", "Special Damage",
]
# Dev-only stat (see app/models/card.py) — intentionally left out of
# CORE_CATEGORIES so an unscraped stub card isn't considered "scraped"
# just because Hit Speed happens to be filled in.

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
    if "Hit Speed" in key:
        return "Hit Speed"
    return key


def pick(stats: dict, category: str):
    """Returns the value for a category, preferring an exact-name key match
    over a sub-entity variant (e.g. plain "Target" over "Zap Target") — but
    only when that exact match actually has data. A multi-entity card (e.g.
    Rascal Girl) can end up with a real value only under an entity-prefixed
    key ("Rascal Girl Hit Speed") while the plain key sits at its "N/A"
    default, so an exact "N/A" is treated as no-match and a variant with
    real data wins instead."""
    exact = stats.get(category)
    if exact not in (None, "N/A"):
        return exact
    for key, value in stats.items():
        if key != "__NOTE__" and key != category and categorize(key) == category:
            return value
    return exact


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
    _, hit_speed_text = split_value(pick(stats, "Hit Speed"))

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
        "hit_speed": clean(hit_speed_text),
    }


def print_named_list(label: str, names: list[str]) -> None:
    print(f"{label} ({len(names)}):")
    if names:
        for name in names:
            print(f"  - {name}")
    else:
        print("  (none)")


def main():
    with open(CARDS_JSON, encoding="utf-8") as f:
        cards_json = json.load(f)

    db = SessionLocal()
    created_names, updated_names, skipped_names = [], [], []
    deleted_names, kept_for_history_names, added_to_pool_names = [], [], []
    try:
        json_names = set()
        for name, stats in cards_json.items():
            if name == "__NOTE__":
                continue
            if is_unscraped(stats):
                skipped_names.append(name)
                continue

            json_names.add(name)
            fields = build_card_fields(name, stats)

            existing = db.query(Card).filter(Card.name == name).first()
            if existing:
                for key, value in fields.items():
                    setattr(existing, key, value)
                updated_names.append(name)
            else:
                db.add(Card(**fields))
                created_names.append(name)

        # flush so any newly created cards get an id before we check pool/history
        db.flush()

        # any card currently in the JSON that's missing from BOTH answer_pool
        # and daily_answers needs to go in the pool — covers brand new cards
        # AND existing cards that never got added (like the Ronin gap)
        pool_card_ids = {row.card_id for row in db.query(AnswerPool.card_id).all()}
        history_card_ids = {row.card_id for row in db.query(DailyAnswer.card_id).all()}

        current_cycle = db.query(func.max(AnswerPool.cycle_number)).scalar() or 1

        current_cards = db.query(Card).filter(Card.name.in_(json_names)).all()
        for card in current_cards:
            if card.id not in pool_card_ids and card.id not in history_card_ids:
                db.add(AnswerPool(card_id=card.id, cycle_number=current_cycle))
                added_to_pool_names.append(card.name)

        # cards removed from all_cards.json: delete them (and their
        # answer_pool row) UNLESS they have daily_answers history, in which
        # case leave the card and its history alone entirely
        stale_cards = db.query(Card).filter(~Card.name.in_(json_names)).all()
        for card in stale_cards:
            has_history = db.query(DailyAnswer).filter(
                DailyAnswer.card_id == card.id
            ).first()
            if has_history:
                kept_for_history_names.append(card.name)
                continue

            db.query(AnswerPool).filter(AnswerPool.card_id == card.id).delete()
            db.delete(card)
            deleted_names.append(card.name)

        db.commit()
    finally:
        db.close()

    total = len(created_names) + len(updated_names)
    print(
        f"Loaded {total} cards ({len(created_names)} created, {len(updated_names)} updated), "
        f"skipped {len(skipped_names)} unscraped stub(s), "
        f"added {len(added_to_pool_names)} to answer_pool, "
        f"deleted {len(deleted_names)} stale card(s), "
        f"kept {len(kept_for_history_names)} stale card(s) with daily_answers history."
    )
    print()
    print_named_list("Created", created_names)
    print()
    print_named_list("Updated", updated_names)
    print()
    print_named_list("Skipped (unscraped stub)", skipped_names)
    print()
    print_named_list("Added to answer_pool", added_to_pool_names)
    print()
    print_named_list("Deleted (stale)", deleted_names)
    print()
    print_named_list("Kept (stale, but has daily_answers history)", kept_for_history_names)


if __name__ == "__main__":
    main()