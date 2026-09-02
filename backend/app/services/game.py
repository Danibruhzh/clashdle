"""Server-side port of frontend/src/utils/compareStats.ts.

Compares a guessed Card against the secret Card and returns per-stat
feedback (match / higher / lower / mismatch). This is the security-critical
piece the whole backend exists for: the secret card's actual values must
never be sent to the client, only this comparison result.

Unlike the frontend version, this doesn't need to parse strings like
"230 (115 x2)" out of a raw StatValue — load_cards.py already did that when
populating the `cards` table, so every field here is a plain int-or-None or
str-or-None column read straight off the Card model.
"""
from enum import Enum
from typing import Optional

from app.models.card import Card

# Matches Wordle's convention of a fixed number of tries per day. Enforced
# server-side in routers/game.py (not just hidden client-side once reached),
# since a guest session is trivially replayable by anyone hitting the API
# directly.
MAX_GUESSES = 8


class StatComparison(str, Enum):
    MATCH = "match"
    MISMATCH = "mismatch"
    HIGHER = "higher"
    LOWER = "lower"


# Compared as higher/lower/match. rarity_rank stands in for `rarity` here —
# Common < Rare < Epic < Legendary < Champion — see the comment on that
# column in models/card.py.
NUMERIC_FIELDS = ["cost", "hitpoints", "damage", "dps", "special_damage", "rarity_rank"]

# Compared as plain equality only.
CATEGORICAL_FIELDS = ["type", "target"]

# The stat name reported to the client for each compared field, keyed by
# model attribute. rarity_rank is compared numerically but still reported
# under "Rarity", matching the label the player actually sees.
FIELD_TO_STAT_NAME = {
    "cost": "Cost",
    "type": "Type",
    "rarity_rank": "Rarity",
    "target": "Target",
    "hitpoints": "Hitpoints",
    "damage": "Damage",
    "dps": "Damage Per Second",
    "special_damage": "Special Damage",
}


def compare_numeric(secret_value: Optional[int], guess_value: Optional[int]) -> StatComparison:
    """Mirrors compareStats.ts's numeric branch: a missing value (N/A) only
    matches another missing value, never treated as higher/lower than a
    real number."""
    if secret_value is None or guess_value is None:
        return StatComparison.MATCH if secret_value == guess_value else StatComparison.MISMATCH
    if secret_value == guess_value:
        return StatComparison.MATCH
    return StatComparison.HIGHER if secret_value > guess_value else StatComparison.LOWER


def compare_categorical(secret_value: Optional[str], guess_value: Optional[str]) -> StatComparison:
    return StatComparison.MATCH if secret_value == guess_value else StatComparison.MISMATCH


def compare_cards(secret: Card, guess: Card) -> dict[str, StatComparison]:
    """Returns {stat name: comparison} for every stat category, comparing
    `guess` against `secret`."""
    result: dict[str, StatComparison] = {}

    for field in NUMERIC_FIELDS:
        stat_name = FIELD_TO_STAT_NAME[field]
        result[stat_name] = compare_numeric(getattr(secret, field), getattr(guess, field))

    for field in CATEGORICAL_FIELDS:
        stat_name = FIELD_TO_STAT_NAME[field]
        result[stat_name] = compare_categorical(getattr(secret, field), getattr(guess, field))

    return result


def is_correct_guess(comparisons: dict[str, StatComparison]) -> bool:
    """True once every stat is a match — the win condition."""
    return all(value == StatComparison.MATCH for value in comparisons.values())
