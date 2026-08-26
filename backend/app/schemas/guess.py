from pydantic import BaseModel


class GuessRequest(BaseModel):
    guess_name: str


class GuessResponse(BaseModel):
    comparisons: dict[str, str]
    is_correct: bool


class PastGuess(BaseModel):
    card_name: str
    comparisons: dict[str, str]
    is_correct: bool


class TodayGuessesResponse(BaseModel):
    guesses: list[PastGuess]


class PreviousAnswerResponse(BaseModel):
    # None when yesterday never got a daily_answers row (e.g. the app didn't
    # exist yet, or a day was skipped) — nothing to show in that case.
    card_name: str | None


class TodayWinnersResponse(BaseModel):
    winners_count: int
