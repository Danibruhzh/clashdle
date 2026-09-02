from pydantic import BaseModel


class GuessRequest(BaseModel):
    guess_name: str


class GuessResponse(BaseModel):
    comparisons: dict[str, str]
    is_correct: bool
    # Set only on the guess that uses up the last try without winning —
    # reveals today's card the same way Wordle shows the answer on a loss.
    # None on every other guess, correct or not.
    reveal_answer: str | None = None


class PastGuess(BaseModel):
    card_name: str
    comparisons: dict[str, str]
    is_correct: bool


class TodayGuessesResponse(BaseModel):
    guesses: list[PastGuess]
    # Set when this session already lost today (MAX_GUESSES used, none
    # correct) — lets a page refresh after a loss still show the answer.
    reveal_answer: str | None = None


class PreviousAnswerResponse(BaseModel):
    # None when yesterday never got a daily_answers row (e.g. the app didn't
    # exist yet, or a day was skipped) — nothing to show in that case.
    card_name: str | None


class TodayWinnersResponse(BaseModel):
    winners_count: int
