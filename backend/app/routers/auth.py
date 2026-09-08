from sqlalchemy import or_
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.models.user_stats import UserStats
from app.schemas.auth import (
    GuestStatsPayload,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
    UserStatsOut,
)

router = APIRouter(tags=["auth"])

# Mirrors services/game.py's MAX_GUESSES — the histogram only ever has
# buckets 1-8, so anything else in a guest's localStorage data (e.g. a stray
# pre-guess-cap entry from before that cap existed) is dropped rather than
# rejected at signup.
HISTOGRAM_BUCKETS = range(1, 9)


def _build_seeded_stats(user_id: int, guest_stats: GuestStatsPayload | None) -> UserStats:
    stats = UserStats(user_id=user_id)
    if guest_stats is None:
        return stats

    bucket_counts = {}
    for bucket in HISTOGRAM_BUCKETS:
        count = guest_stats.histogram.get(str(bucket), 0)
        bucket_counts[bucket] = count if count > 0 else 0
        setattr(stats, f"guesses_{bucket}", bucket_counts[bucket])

    wins = sum(bucket_counts.values())
    stats.wins = wins
    stats.games_played = wins + max(guest_stats.loss_count, 0)
    stats.current_streak = max(guest_stats.streak_count, 0)
    # Never less than the current streak, even if the guest's own stored
    # data was somehow inconsistent (e.g. best never got bumped for some
    # reason) — best is a floor, not just a passthrough.
    stats.best_streak = max(guest_stats.best_streak, stats.current_streak)
    stats.last_win_date = guest_stats.last_win_date
    return stats


@router.post("/auth/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()

    if db.query(User).filter(User.username == payload.username).first() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
    if db.query(User).filter(User.email == email).first() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(username=payload.username, email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.flush()  # assigns user.id without a full commit yet

    db.add(_build_seeded_stats(user.id, payload.guest_stats))
    db.commit()

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip()
    user = (
        db.query(User)
        .filter(or_(User.username == identifier, User.email == identifier.lower()))
        .first()
    )
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username/email or password"
    )
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise invalid_credentials

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def read_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/stats", response_model=UserStatsOut)
def read_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stats = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
    if stats is None:
        # Shouldn't happen (register() always creates one alongside the
        # user), but a registered account with no row yet reads as all
        # zeros rather than a 404 — nothing meaningfully "missing" from the
        # caller's point of view.
        return UserStatsOut(games_played=0, wins=0, current_streak=0, best_streak=0, histogram={})

    histogram = {str(b): getattr(stats, f"guesses_{b}") for b in HISTOGRAM_BUCKETS}
    return UserStatsOut(
        games_played=stats.games_played,
        wins=stats.wins,
        current_streak=stats.current_streak,
        best_streak=stats.best_streak,
        histogram=histogram,
    )
