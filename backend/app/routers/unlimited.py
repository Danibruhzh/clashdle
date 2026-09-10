from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user
from app.core.time import get_client_today
from app.db.session import get_db
from app.models.card import Card
from app.models.unlimited_guess import UnlimitedGuess
from app.models.unlimited_stats import UnlimitedStats
from app.models.user import User
from app.schemas.unlimited import (
    UnlimitedGuessRequest,
    UnlimitedGuessResponse,
    UnlimitedPastGuess,
    UnlimitedRoundResponse,
    UnlimitedStatsOut,
)
from app.services.daily_answer import has_finished_daily
from app.services.game import MAX_GUESSES, compare_cards, is_correct_guess
from app.services.unlimited import get_active_round, start_new_round
from app.services.unlimited_stats import GUESS_BUCKET_COLUMNS, get_or_create_stats, record_loss, record_win

router = APIRouter(prefix="/unlimited", tags=["unlimited"])


@router.get("/current", response_model=UnlimitedRoundResponse)
def current_round(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Restores an in-progress round's guesses so far — e.g. after a page
    refresh. A finished round never shows up here: /guess below deletes a
    round's rows the instant it's won or lost, so "no active round" just
    means "nothing in progress right now", not "lost/won and hidden"."""
    round_ = get_active_round(db, current_user.id)
    if round_ is None:
        return UnlimitedRoundResponse(guesses=[], has_active_round=False)

    past_guesses = (
        db.query(UnlimitedGuess)
        .options(joinedload(UnlimitedGuess.guessed_card))
        .filter(UnlimitedGuess.unlimited_answer_id == round_.id)
        .order_by(UnlimitedGuess.created_at.asc())
        .all()
    )
    return UnlimitedRoundResponse(
        guesses=[
            UnlimitedPastGuess(
                card_name=g.guessed_card.name,
                comparisons=compare_cards(round_.card, g.guessed_card),
                is_correct=g.is_correct,
            )
            for g in past_guesses
        ],
        has_active_round=True,
    )


@router.post("/start", response_model=UnlimitedRoundResponse)
def start_round(
    db: Session = Depends(get_db),
    today: date = Depends(get_client_today),
    current_user: User = Depends(get_current_user),
):
    if not has_finished_daily(db, current_user.id, today):
        raise HTTPException(status_code=400, detail="Finish today's daily game before playing Unlimited")

    start_new_round(db, current_user.id)
    return UnlimitedRoundResponse(guesses=[], has_active_round=True)


@router.post("/guess", response_model=UnlimitedGuessResponse)
def guess(
    payload: UnlimitedGuessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    round_ = get_active_round(db, current_user.id)
    if round_ is None:
        raise HTTPException(status_code=400, detail="No active Unlimited round — start one first")

    guessed_card = db.query(Card).filter(Card.name == payload.guess_name).first()
    if guessed_card is None:
        raise HTTPException(status_code=404, detail=f"No card named '{payload.guess_name}'")

    past_guesses = db.query(UnlimitedGuess).filter(UnlimitedGuess.unlimited_answer_id == round_.id).all()
    if len(past_guesses) >= MAX_GUESSES:
        raise HTTPException(status_code=400, detail="Out of guesses for this round")

    comparisons = compare_cards(round_.card, guessed_card)
    correct = is_correct_guess(comparisons)
    guess_number = len(past_guesses) + 1
    out_of_guesses = not correct and guess_number >= MAX_GUESSES

    if correct or out_of_guesses:
        # Round's over — record the aggregate stats, then discard every row
        # for this round (including this final guess: there's no point
        # persisting a guess that's about to be deleted anyway) rather than
        # keeping any per-round history, per how this was scoped.
        stats = get_or_create_stats(db, current_user.id)
        if correct:
            record_win(stats, guess_number)
        else:
            record_loss(stats)
        db.query(UnlimitedGuess).filter(UnlimitedGuess.unlimited_answer_id == round_.id).delete()
        db.delete(round_)
    else:
        db.add(
            UnlimitedGuess(
                unlimited_answer_id=round_.id,
                guessed_card_id=guessed_card.id,
                user_id=current_user.id,
                is_correct=False,
            )
        )

    reveal_answer = round_.card.name if out_of_guesses else None
    db.commit()

    return UnlimitedGuessResponse(comparisons=comparisons, is_correct=correct, reveal_answer=reveal_answer)


@router.get("/stats", response_model=UnlimitedStatsOut)
def read_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Read-only, like /me/stats — a GET shouldn't write, so a player with no
    # rounds finished yet just reads back as all zeros rather than this
    # route creating a row for them (that only ever happens where a row is
    # actually needed: see services/unlimited_stats.get_or_create_stats,
    # called from routers/unlimited.py's /guess on an actual finished round).
    stats = db.query(UnlimitedStats).filter(UnlimitedStats.user_id == current_user.id).first()
    if stats is None:
        return UnlimitedStatsOut(games_played=0, wins=0, current_streak=0, best_streak=0, histogram={})

    histogram = {str(b): getattr(stats, col) for b, col in GUESS_BUCKET_COLUMNS.items()}
    return UnlimitedStatsOut(
        games_played=stats.games_played,
        wins=stats.wins,
        current_streak=stats.current_streak,
        best_streak=stats.best_streak,
        histogram=histogram,
    )
