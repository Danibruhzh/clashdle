"""Global top-15 rankings for registered accounts.

Guests are omitted because their stats live in the browser. Win streak and
most wins use Unlimited only, since the daily game gives everyone at most one
win per day. Average guesses is Unlimited-only too, so every leaderboard tab
reflects the replayable mode.

The weighted average is calculated in Python for readability and to match the
frontend math directly.
"""
from sqlalchemy.orm import Session

from app.models.unlimited_stats import UnlimitedStats
from app.models.user import User
from app.services.user_stats import GUESS_BUCKET_COLUMNS

TOP_N = 15

# Keep one lucky win from topping the average-guesses board.
MIN_WINS_FOR_AVG_LEADERBOARD = 5


def get_top_streak(db: Session) -> list[tuple[str, int]]:
    return (
        db.query(User.username, UnlimitedStats.best_streak)
        .join(UnlimitedStats, UnlimitedStats.user_id == User.id)
        .filter(UnlimitedStats.best_streak > 0)
        .order_by(UnlimitedStats.best_streak.desc())
        .limit(TOP_N)
        .all()
    )


def get_top_wins(db: Session) -> list[tuple[str, int]]:
    return (
        db.query(User.username, UnlimitedStats.wins)
        .join(UnlimitedStats, UnlimitedStats.user_id == User.id)
        .filter(UnlimitedStats.wins > 0)
        .order_by(UnlimitedStats.wins.desc())
        .limit(TOP_N)
        .all()
    )


def _guess_sum_and_wins(stats: UnlimitedStats | None) -> tuple[int, int]:
    if stats is None:
        return 0, 0
    total_guesses = sum(n * getattr(stats, col) for n, col in GUESS_BUCKET_COLUMNS.items())
    total_wins = sum(getattr(stats, col) for col in GUESS_BUCKET_COLUMNS.values())
    return total_guesses, total_wins


def get_top_avg_guesses(db: Session) -> list[tuple[str, float]]:
    rows = (
        db.query(User.username, UnlimitedStats)
        .join(UnlimitedStats, UnlimitedStats.user_id == User.id)
        .all()
    )

    entries = []
    for username, unlimited in rows:
        unlimited_guesses, unlimited_wins = _guess_sum_and_wins(unlimited)
        if unlimited_wins < MIN_WINS_FOR_AVG_LEADERBOARD:
            continue
        entries.append((username, unlimited_guesses / unlimited_wins))

    entries.sort(key=lambda entry: entry[1])
    return entries[:TOP_N]
