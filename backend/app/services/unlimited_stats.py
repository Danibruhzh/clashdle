"""Unlimited-mode equivalent of services/user_stats.py — see
models/unlimited_stats.py for why there's no date logic here at all: the
streak is purely round-based (breaks on a loss, not on a missed day), so
unlike the daily game's current_streak there's no "effective" value to
compute at read time. Whatever's stored is already correct."""
from sqlalchemy.orm import Session

from app.models.unlimited_stats import UnlimitedStats

GUESS_BUCKET_COLUMNS = {n: f"guesses_{n}" for n in range(1, 9)}


def get_or_create_stats(db: Session, user_id: int) -> UnlimitedStats:
    stats = db.query(UnlimitedStats).filter(UnlimitedStats.user_id == user_id).first()
    if stats is None:
        stats = UnlimitedStats(user_id=user_id)
        db.add(stats)
        db.flush()
    return stats


def record_win(stats: UnlimitedStats, guess_count: int) -> None:
    stats.games_played += 1
    stats.wins += 1
    setattr(stats, GUESS_BUCKET_COLUMNS[guess_count], getattr(stats, GUESS_BUCKET_COLUMNS[guess_count]) + 1)
    stats.current_streak += 1
    stats.best_streak = max(stats.best_streak, stats.current_streak)


def record_loss(stats: UnlimitedStats) -> None:
    stats.games_played += 1
    stats.current_streak = 0
