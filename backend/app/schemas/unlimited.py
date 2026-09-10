from pydantic import BaseModel


class UnlimitedGuessRequest(BaseModel):
    guess_name: str


class UnlimitedGuessResponse(BaseModel):
    comparisons: dict[str, str]
    is_correct: bool
    # Set only on the guess that uses up the last try without winning —
    # same meaning as GuessResponse.reveal_answer. By the time this response
    # goes out the round's rows are already deleted (see routers/unlimited.py),
    # so this is the only place the frontend ever sees this round's card.
    reveal_answer: str | None = None


class UnlimitedPastGuess(BaseModel):
    card_name: str
    comparisons: dict[str, str]
    is_correct: bool


class UnlimitedRoundResponse(BaseModel):
    # None means "no round in progress" — the frontend shows a Play Again /
    # Start button in that case rather than a card search bar.
    guesses: list[UnlimitedPastGuess]
    has_active_round: bool


class UnlimitedStatsOut(BaseModel):
    games_played: int
    wins: int
    current_streak: int
    best_streak: int
    histogram: dict[str, int]
