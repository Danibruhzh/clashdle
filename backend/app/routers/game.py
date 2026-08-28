import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
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
from app.services.game import compare_cards, is_correct_guess

router = APIRouter(prefix="/game", tags=["game"])

GUEST_SESSION_COOKIE = "guest_session_id"
GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 400  # ~400 days; browsers cap cookie lifetime near there anyway


@router.post("/guess", response_model=GuessResponse)
def guess(
    payload: GuessRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    today: date = Depends(get_client_today),
):
    # Identify this browser without requiring login. The cookie is set once
    # on the player's first-ever guess and reused after that; it's how a
    # Guess row gets attributed to "this device" without a users row.
    guest_session_id = request.cookies.get(GUEST_SESSION_COOKIE)
    if not guest_session_id:
        guest_session_id = str(uuid.uuid4())
        response.set_cookie(
            key=GUEST_SESSION_COOKIE,
            value=guest_session_id,
            max_age=GUEST_SESSION_MAX_AGE,
            httponly=True,
            samesite="none",
            secure=True,
        )

    guessed_card = db.query(Card).filter(Card.name == payload.guess_name).first()
    if guessed_card is None:
        raise HTTPException(status_code=404, detail=f"No card named '{payload.guess_name}'")

    daily_answer = get_or_create_daily_answer(db, today)
    secret_card = daily_answer.card

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

    return GuessResponse(comparisons=comparisons, is_correct=correct)


@router.get("/today", response_model=TodayGuessesResponse)
def today_guesses(
    request: Request, db: Session = Depends(get_db), today: date = Depends(get_client_today)
):
    """Replays this browser's guesses for today's answer, so a page refresh
    doesn't lose progress. Comparisons aren't stored on the Guess row — they're
    just recomputed here the same way /guess computed them originally, since
    they're a pure function of (secret card, guessed card)."""
    guest_session_id = request.cookies.get(GUEST_SESSION_COOKIE)
    if not guest_session_id:
        # Never guessed on this browser before — nothing to restore, and
        # nothing worth creating a cookie or touching the DB for yet.
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

    return TodayGuessesResponse(
        guesses=[
            PastGuess(
                card_name=g.guessed_card.name,
                comparisons=compare_cards(secret_card, g.guessed_card),
                is_correct=g.is_correct,
            )
            for g in past_guesses
        ]
    )


@router.get("/today/winners", response_model=TodayWinnersResponse)
def today_winners(db: Session = Depends(get_db), today: date = Depends(get_client_today)):
    """How many distinct guest sessions have correctly guessed today's secret
    card so far — public, not tied to this browser's own cookie. Counts
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
