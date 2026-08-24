from pydantic import BaseModel


class GuessRequest(BaseModel):
    guess_name: str


class GuessResponse(BaseModel):
    comparisons: dict[str, str]
    is_correct: bool
