# app/models/user_stats.py
from sqlalchemy import Column, Date, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.db.base import Base


class UserStats(Base):
    """One row per registered user — the server-side mirror of what guests
    keep in localStorage (guessHistogram.ts + streak.ts). Seeded once from a
    guest's localStorage numbers at registration (see routers/auth.py); from
    then on this is the sole source of truth for that account, the same way
    CLAUDE.md describes guest stats moving from localStorage to server-side
    once an account exists.

    guesses_1..guesses_8 store exact historical win counts. New games use
    the current MAX_GUESSES cap, but guesses_8 stays as legacy data for
    averages/profile history.
    """

    __tablename__ = "user_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    games_played = Column(Integer, nullable=False, default=0)
    wins = Column(Integer, nullable=False, default=0)

    current_streak = Column(Integer, nullable=False, default=0)
    best_streak = Column(Integer, nullable=False, default=0)
    # The player's own local date (see core/time.py's get_client_today) of
    # their most recent win — read-time self-correcting streak logic (same
    # trick as streak.ts's getStreak): current_streak only counts if this is
    # today or yesterday, otherwise it's read as lapsed without needing a
    # write to record that.
    last_win_date = Column(Date, nullable=True)

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
        return f"<UserStats user_id={self.user_id} games_played={self.games_played} wins={self.wins}>"
