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
    # All leaderboard categories are Unlimited-only.
    top_streak: list[StreakEntry]
    top_wins: list[WinsEntry]
    top_avg_guesses: list[AvgGuessesEntry]
