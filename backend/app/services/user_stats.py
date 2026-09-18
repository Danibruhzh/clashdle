"""Server-side mirror of what guests keep in localStorage (guessHistogram.ts
+ streak.ts) — see routers/game.py for where these get called, and
UserStats's own docstring for why stats live as one row per user rather
than a child table."""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.user_stats import UserStats

# guess_count -> the column that bucket lives in. New games cap at
# services/game.py's MAX_GUESSES, but bucket 8 stays for legacy wins from
# before the cap changed.
GUESS_BUCKET_COLUMNS = {n: f"guesses_{n}" for n in range(1, 9)}


def get_or_create_stats(db: Session, user_id: int) -> UserStats:
    stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
    if stats is None:
        stats = UserStats(user_id=user_id)
        db.add(stats)
        db.flush()
    return stats


def record_win(stats: UserStats, guess_count: int, today: date) -> None:
    """Call once per completed win — mirrors guessHistogram.ts's recordWin
    (histogram) and streak.ts's recordStreakWin (streak) in one step, since
    the backend has no equivalent split between "live win" and "restore"
    call sites to keep separate; routers/game.py only ever calls this from
    the actual live-guess path."""
    stats.games_played += 1
    stats.wins += 1
    setattr(stats, GUESS_BUCKET_COLUMNS[guess_count], getattr(stats, GUESS_BUCKET_COLUMNS[guess_count]) + 1)

    yesterday = today - timedelta(days=1)
    stats.current_streak = stats.current_streak + 1 if stats.last_win_date == yesterday else 1
    stats.best_streak = max(stats.best_streak, stats.current_streak)
    stats.last_win_date = today


def record_loss(stats: UserStats) -> None:
    """Call once per completed loss (the guess that uses up the final try) —
    mirrors guessHistogram.ts's recordLoss. Deliberately doesn't touch
    current_streak/last_win_date, same as the guest side: a loss doesn't
    extend a streak, but a lapsed one is read as 0 lazily (see
    get_effective_current_streak below) rather than explicitly zeroed here."""
    stats.games_played += 1


def get_effective_current_streak(stats: UserStats, today: date) -> int:
    """Same self-correcting trick as streak.ts's getStreak(): the stored
    current_streak only counts if the last win was today or yesterday,
    otherwise it's read as lapsed without needing a write to record that."""
    yesterday = today - timedelta(days=1)
    if stats.last_win_date not in (today, yesterday):
        return 0
    return stats.current_streak
