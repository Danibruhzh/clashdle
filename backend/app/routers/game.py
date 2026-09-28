from datetime import date, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_optional_current_user
from app.core.time import get_client_today
from app.db.session import get_db
from app.models.card import Card
from app.models.daily_answer import DailyAnswer
from app.models.guess import Guess
from app.models.user import User
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
from app.services.user_stats import get_or_create_stats, record_loss, record_win

router = APIRouter(prefix="/game", tags=["game"])


@router.post("/guess", response_model=GuessResponse)
def guess(
    payload: GuessRequest,
    db: Session = Depends(get_db),
    today: date = Depends(get_client_today),
    # Browser-generated guest id. It lets guests restore today's guesses
    # without relying on cross-site cookies. Logged-in users ignore it because
    # current_user takes priority.
    guest_session_id: str | None = Header(default=None, alias="X-Guest-Session-Id"),
    current_user: User | None = Depends(get_optional_current_user),
):
    if current_user is None and not guest_session_id:
        raise HTTPException(status_code=400, detail="Missing guest session or auth")

    guessed_card = db.query(Card).filter(Card.name == payload.guess_name).first()
    if guessed_card is None:
        raise HTTPException(status_code=404, detail=f"No card named '{payload.guess_name}'")

    daily_answer = get_or_create_daily_answer(db, today)
    secret_card = daily_answer.card

    identity_filter = (
        Guess.user_id == current_user.id if current_user else Guess.guest_session_id == guest_session_id
    )
    past_guesses = db.query(Guess).filter(Guess.daily_answer_id == daily_answer.id, identity_filter).all()
    if any(g.is_correct for g in past_guesses):
        raise HTTPException(status_code=400, detail="Already guessed today's card correctly")
    if len(past_guesses) >= MAX_GUESSES:
        raise HTTPException(status_code=400, detail="Out of guesses for today")

    comparisons = compare_cards(secret_card, guessed_card)
    correct = is_correct_guess(comparisons)
    guess_number = len(past_guesses) + 1  # this guess's own position, 1-indexed

    db.add(
        Guess(
            daily_answer_id=daily_answer.id,
            guessed_card_id=guessed_card.id,
            guest_session_id=guest_session_id if current_user is None else None,
            user_id=current_user.id if current_user else None,
            is_correct=correct,
        )
    )

    # If this guess used the final try, reveal the answer immediately.
    out_of_guesses = not correct and guess_number >= MAX_GUESSES
    reveal_answer = secret_card.name if out_of_guesses else None

    if current_user is not None:
        stats = get_or_create_stats(db, current_user.id)
        if correct:
            record_win(stats, guess_number, today)
        elif out_of_guesses:
            record_loss(stats)

    db.commit()

    return GuessResponse(comparisons=comparisons, is_correct=correct, reveal_answer=reveal_answer)


@router.get("/today", response_model=TodayGuessesResponse)
def today_guesses(
    db: Session = Depends(get_db),
    today: date = Depends(get_client_today),
    guest_session_id: str | None = Header(default=None, alias="X-Guest-Session-Id"),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Replay this player's guesses for today's answer after a refresh.

    Comparisons are not stored on Guess rows. They are a pure function of the
    secret card and guessed card, so we recompute them here.
    """
    if current_user is None and not guest_session_id:
        # Nothing to restore yet, and no need to touch the database.
        return TodayGuessesResponse(guesses=[])

    daily_answer = get_or_create_daily_answer(db, today)
    secret_card = daily_answer.card

    identity_filter = (
        Guess.user_id == current_user.id if current_user else Guess.guest_session_id == guest_session_id
    )
    past_guesses = (
        db.query(Guess)
        .options(joinedload(Guess.guessed_card))
        .filter(Guess.daily_answer_id == daily_answer.id, identity_filter)
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
    """Count distinct winners for the requesting player's daily card.

    Guests and registered users are attributed with different columns, so this
    counts unclaimed guest winners plus registered winners. Guest guesses moved
    into an account during signup count on the registered side only.
    """
    daily_answer = get_or_create_daily_answer(db, today)

    guest_winners = (
        db.query(Guess.guest_session_id)
        .filter(
            Guess.daily_answer_id == daily_answer.id,
            Guess.is_correct.is_(True),
            Guess.guest_session_id.isnot(None),
            Guess.user_id.is_(None),
        )
        .distinct()
        .count()
    )
    user_winners = (
        db.query(Guess.user_id)
        .filter(Guess.daily_answer_id == daily_answer.id, Guess.is_correct.is_(True), Guess.user_id.isnot(None))
        .distinct()
        .count()
    )

    return TodayWinnersResponse(winners_count=guest_winners + user_winners)


@router.get("/previous-answer", response_model=PreviousAnswerResponse)
def previous_answer(db: Session = Depends(get_db), today: date = Depends(get_client_today)):
    """Return yesterday's secret card for the footer, if one exists."""
    yesterday = today - timedelta(days=1)
    daily_answer = (
        db.query(DailyAnswer)
        .options(joinedload(DailyAnswer.card))
        .filter(DailyAnswer.date == yesterday)
        .first()
    )
    return PreviousAnswerResponse(card_name=daily_answer.card.name if daily_answer else None)
