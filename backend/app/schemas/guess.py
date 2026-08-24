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
