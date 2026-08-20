from pydantic import BaseModel


class GuessRequest(BaseModel):
    guess_name: str


class GuessedCard(BaseModel):
    """Display-ready stats for the card the player just guessed. Only ever
    built from the guessed card, never the secret one."""

    name: str
    cost: int | None = None
    type: str | None = None
    rarity: str | None = None
    target: str | None = None
    hitpoints_raw: str | None = None
    damage_raw: str | None = None
    damage_stage_label: str | None = None
    dps_raw: str | None = None
    dps_stage_label: str | None = None
    special_damage_raw: str | None = None
    special_damage_label: str | None = None


class GuessResponse(BaseModel):
    card: GuessedCard
    comparisons: dict[str, str]
    correct: bool
