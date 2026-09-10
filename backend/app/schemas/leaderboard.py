from pydantic import BaseModel


class StreakEntry(BaseModel):
    username: str
    best_streak: int


class WinsEntry(BaseModel):
    username: str
    wins: int


class AvgGuessesEntry(BaseModel):
    username: str
    avg_guesses: float


class LeaderboardResponse(BaseModel):
    # Unlimited-only — see services/leaderboard.py's own docstring for why
    # these two specifically don't fold in the daily game the way
    # top_avg_guesses does.
    top_streak: list[StreakEntry]
    top_wins: list[WinsEntry]
    # Combines daily + Unlimited wins, same as ProfileModal's own
    # averageGuessesToWin on the frontend.
    top_avg_guesses: list[AvgGuessesEntry]
