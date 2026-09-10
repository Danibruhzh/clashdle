# app/models/unlimited_stats.py
from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.db.base import Base


class UnlimitedStats(Base):
    """One row per registered user — the Unlimited-mode equivalent of
    UserStats, kept entirely separate from the daily game's numbers. No
    last_win_date/self-correcting-streak logic like UserStats has: that
    exists there because the daily streak is date-based ("did you win
    yesterday or today"), but Unlimited has no day-based cadence at all —
    rounds can happen any number of times in a row, so current_streak here
    is just "consecutive round wins", written directly on every win/loss
    with nothing to self-correct at read time.

    guesses_1..guesses_8 mirror UserStats' histogram columns — same
    MAX_GUESSES cap, since Unlimited rounds play by the exact same 8-guess
    rule as the daily game (see routers/unlimited.py)."""

    __tablename__ = "unlimited_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    games_played = Column(Integer, nullable=False, default=0)
    wins = Column(Integer, nullable=False, default=0)

    current_streak = Column(Integer, nullable=False, default=0)
    best_streak = Column(Integer, nullable=False, default=0)

    guesses_1 = Column(Integer, nullable=False, default=0)
    guesses_2 = Column(Integer, nullable=False, default=0)
    guesses_3 = Column(Integer, nullable=False, default=0)
    guesses_4 = Column(Integer, nullable=False, default=0)
    guesses_5 = Column(Integer, nullable=False, default=0)
    guesses_6 = Column(Integer, nullable=False, default=0)
    guesses_7 = Column(Integer, nullable=False, default=0)
    guesses_8 = Column(Integer, nullable=False, default=0)

    user = relationship("User")

    def __repr__(self):
        return f"<UnlimitedStats user_id={self.user_id} games_played={self.games_played} wins={self.wins}>"
