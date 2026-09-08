from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class GuestStatsPayload(BaseModel):
    """Optional — the frontend reads this browser's localStorage numbers
    once at signup and sends them here so a brand-new account doesn't start
    at zero. Absent entirely (or any field on it) just means "nothing to
    seed with", never an error — a signup with no prior guest play is just
    as valid as one with years of it."""

    # {"<guess count 1-8>": <times achieved>} — mirrors guessHistogram.ts's
    # Histogram shape as JSON.stringify actually produces it (numeric keys
    # become strings). Anything outside 1-8 (e.g. a stray pre-guess-cap
    # entry from old data) is silently dropped in the router rather than
    # rejected — it's not this endpoint's job to validate the guest's own
    # history, just to fold in whatever's usable from it.
    histogram: dict[str, int] = Field(default_factory=dict)
    loss_count: int = 0
    streak_count: int = 0
    best_streak: int = 0
    # The player's own local date their current streak's last win landed
    # on — same meaning as streak.ts's lastWinDate. None if they have no
    # streak going (or never had one).
    last_win_date: date | None = None


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    guest_stats: GuestStatsPayload | None = None

    @field_validator("username")
    @classmethod
    def username_no_surrounding_whitespace(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Username can't be blank")
        return stripped


class LoginRequest(BaseModel):
    # Either a username or an email — see login() in routers/auth.py for how
    # this gets resolved to one or the other.
    identifier: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserStatsOut(BaseModel):
    games_played: int
    wins: int
    current_streak: int
    best_streak: int
    # {"1": times, ..., "8": times} — same shape the frontend already reads
    # off getHistogram(), so StatsPanel's chart logic doesn't need a second
    # code path for the logged-in case.
    histogram: dict[str, int]
