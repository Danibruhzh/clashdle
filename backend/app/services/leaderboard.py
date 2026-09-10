"""Global top-15 rankings across all registered accounts — guests never
appear here at all, since none of this data exists server-side for them
(see CLAUDE.md's guest/account split).

Highest win streak and most wins are Unlimited-only, deliberately — the
daily game only ever offers one win per day for everyone, so a "most wins"
or "streak" ranking there is really just "who's played longest since
launch", not a skill/activity leaderboard the way it is for Unlimited's
replayable rounds. Lowest average guesses is the one category that folds
the daily game in too (mirrors ProfileModal.tsx's own
averageGuessesToWin), since a single guess count is meaningfully comparable
across both modes — they're both "how many tries to find the same kind of
card" underneath.

Done in Python rather than a cross-table weighted-average SQL query —
simpler to read and match 1:1 against the frontend's own version of this
math, and fine at this project's scale (see MIN_WINS_FOR_AVG_LEADERBOARD's
own note on the one place row count could matter).
"""
from sqlalchemy.orm import Session

from app.models.unlimited_stats import UnlimitedStats
from app.models.user import User
from app.models.user_stats import UserStats
from app.services.user_stats import GUESS_BUCKET_COLUMNS

TOP_N = 15

# A single lucky 1-guess win would otherwise top the average-guesses board
# outright over someone with hundreds of genuinely strong games — this is
# the minimum combined (daily + Unlimited) wins before a player's average
# counts as a ranked, comparable sample rather than a fluke.
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


def _guess_sum_and_wins(stats: UserStats | UnlimitedStats | None) -> tuple[int, int]:
    if stats is None:
        return 0, 0
    total_guesses = sum(n * getattr(stats, col) for n, col in GUESS_BUCKET_COLUMNS.items())
    total_wins = sum(getattr(stats, col) for col in GUESS_BUCKET_COLUMNS.values())
    return total_guesses, total_wins


def get_top_avg_guesses(db: Session) -> list[tuple[str, float]]:
    # outerjoin, not join: a player with only daily wins (never played
    # Unlimited) or only Unlimited wins (fresh account, seeded from a guest
    # who'd never won a daily) should still be eligible — either side can
    # be NULL/None here.
    rows = (
        db.query(User.username, UserStats, UnlimitedStats)
        .outerjoin(UserStats, UserStats.user_id == User.id)
        .outerjoin(UnlimitedStats, UnlimitedStats.user_id == User.id)
        .all()
    )

    entries = []
    for username, daily, unlimited in rows:
        daily_guesses, daily_wins = _guess_sum_and_wins(daily)
        unlimited_guesses, unlimited_wins = _guess_sum_and_wins(unlimited)
        total_wins = daily_wins + unlimited_wins
        if total_wins < MIN_WINS_FOR_AVG_LEADERBOARD:
            continue
        entries.append((username, (daily_guesses + unlimited_guesses) / total_wins))

    entries.sort(key=lambda entry: entry[1])
    return entries[:TOP_N]
