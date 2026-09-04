from datetime import date, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.time import get_client_today
from app.db.session import get_db
from app.models.card import Card
from app.models.daily_answer import DailyAnswer
from app.models.guess import Guess
from app.schemas.guess import (
    GuessRequest,
    GuessResponse,
    PastGuess,
    PreviousAnswerResponse,
    TodayGuessesResponse,
    TodayWinnersResponse,
)
from app.services.daily_answer import get_or_create_daily_answer
from app.services.game import MAX_GUESSES, compare_cards, is_correct_guess

router = APIRouter(prefix="/game", tags=["game"])


@router.post("/guess", response_model=GuessResponse)
def guess(
    payload: GuessRequest,
    db: Session = Depends(get_db),
    today: date = Depends(get_client_today),
    # Identifies this browser without requiring login — generated and stored
    # by the client itself (see frontend/src/utils/guestSession.ts), not a
    # cookie the backend sets. A cross-site cookie here (frontend and backend
    # are on different domains) gets silently blocked by Safari's Intelligent
    # Tracking Prevention regardless of SameSite=None; Secure, which broke
    # guess-restore-on-refresh for some iOS players; a plain header isn't
    # subject to that at all.
    guest_session_id: str = Header(alias="X-Guest-Session-Id"),
):
    guessed_card = db.query(Card).filter(Card.name == payload.guess_name).first()
    if guessed_card is None:
        raise HTTPException(status_code=404, detail=f"No card named '{payload.guess_name}'")

    daily_answer = get_or_create_daily_answer(db, today)
    secret_card = daily_answer.card

    past_guesses = (
        db.query(Guess)
        .filter(Guess.daily_answer_id == daily_answer.id, Guess.guest_session_id == guest_session_id)
        .all()
    )
    if any(g.is_correct for g in past_guesses):
        raise HTTPException(status_code=400, detail="Already guessed today's card correctly")
    if len(past_guesses) >= MAX_GUESSES:
        raise HTTPException(status_code=400, detail="Out of guesses for today")

    comparisons = compare_cards(secret_card, guessed_card)
    correct = is_correct_guess(comparisons)

    db.add(
        Guess(
            daily_answer_id=daily_answer.id,
            guessed_card_id=guessed_card.id,
            guest_session_id=guest_session_id,
            is_correct=correct,
        )
    )
    db.commit()

    # This guess is the one that used up the last try without winning —
    # reveal the answer now instead of waiting for a refresh.
    out_of_guesses = not correct and len(past_guesses) + 1 >= MAX_GUESSES
    reveal_answer = secret_card.name if out_of_guesses else None

    return GuessResponse(comparisons=comparisons, is_correct=correct, reveal_answer=reveal_answer)


@router.get("/today", response_model=TodayGuessesResponse)
def today_guesses(
    db: Session = Depends(get_db),
    today: date = Depends(get_client_today),
    guest_session_id: str | None = Header(default=None, alias="X-Guest-Session-Id"),
):
    """Replays this browser's guesses for today's answer, so a page refresh
    doesn't lose progress. Comparisons aren't stored on the Guess row — they're
    just recomputed here the same way /guess computed them originally, since
    they're a pure function of (secret card, guessed card)."""
    if not guest_session_id:
        # Never guessed on this browser before (or an old cached client that
        # predates the guest-session header — see guess() above) — nothing
        # to restore, and nothing worth touching the DB for yet.
        return TodayGuessesResponse(guesses=[])

    daily_answer = get_or_create_daily_answer(db, today)
    secret_card = daily_answer.card

    past_guesses = (
        db.query(Guess)
        .options(joinedload(Guess.guessed_card))
        .filter(
            Guess.daily_answer_id == daily_answer.id,
            Guess.guest_session_id == guest_session_id,
        )
        .order_by(Guess.created_at.asc())
        .all()
    )

    lost = len(past_guesses) >= MAX_GUESSES and not any(g.is_correct for g in past_guesses)

    return TodayGuessesResponse(
        guesses=[
            PastGuess(
                card_name=g.guessed_card.name,
                comparisons=compare_cards(secret_card, g.guessed_card),
                is_correct=g.is_correct,
            )
            for g in past_guesses
        ],
        reveal_answer=secret_card.name if lost else None,
    )


@router.get("/today/winners", response_model=TodayWinnersResponse)
def today_winners(db: Session = Depends(get_db), today: date = Depends(get_client_today)):
    """How many distinct guest sessions have correctly guessed today's secret
    card so far — public, not tied to this browser's own guest session. Counts
    distinct guest_session_id rather than distinct Guess rows so someone who
    somehow submits the correct guess more than once still only counts once.
    "Today" is this requesting client's own timezone (see core/time.py), so
    this is specifically "winners of the card you're playing", not a single
    worldwide count — players in other timezones may be on a different card
    entirely right now."""
    daily_answer = get_or_create_daily_answer(db, today)

    winners_count = (
        db.query(Guess.guest_session_id)
        .filter(Guess.daily_answer_id == daily_answer.id, Guess.is_correct.is_(True))
        .distinct()
        .count()
    )

    return TodayWinnersResponse(winners_count=winners_count)


@router.get("/previous-answer", response_model=PreviousAnswerResponse)
def previous_answer(db: Session = Depends(get_db), today: date = Depends(get_client_today)):
    """Yesterday's secret card, for the small footer line. Looked up directly
    rather than via get_or_create_daily_answer — a missing row here just means
    nothing to show, not something to generate (unlike today's answer, which
    the game needs to exist)."""
    yesterday = today - timedelta(days=1)
    daily_answer = (
        db.query(DailyAnswer)
        .options(joinedload(DailyAnswer.card))
        .filter(DailyAnswer.date == yesterday)
        .first()
    )
    return PreviousAnswerResponse(card_name=daily_answer.card.name if daily_answer else None)
