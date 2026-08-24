import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.card import Card
from app.models.guess import Guess
from app.schemas.guess import GuessRequest, GuessResponse, PastGuess, TodayGuessesResponse
from app.services.daily_answer import get_or_create_daily_answer
from app.services.game import compare_cards, is_correct_guess

router = APIRouter(prefix="/game", tags=["game"])

GUEST_SESSION_COOKIE = "guest_session_id"
GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 400  # ~400 days; browsers cap cookie lifetime near there anyway


@router.post("/guess", response_model=GuessResponse)
def guess(payload: GuessRequest, request: Request, response: Response, db: Session = Depends(get_db)):
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

    daily_answer = get_or_create_daily_answer(db, date.today())
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
def today_guesses(request: Request, db: Session = Depends(get_db)):
    """Replays this browser's guesses for today's answer, so a page refresh
    doesn't lose progress. Comparisons aren't stored on the Guess row — they're
    just recomputed here the same way /guess computed them originally, since
    they're a pure function of (secret card, guessed card)."""
    guest_session_id = request.cookies.get(GUEST_SESSION_COOKIE)
    if not guest_session_id:
        # Never guessed on this browser before — nothing to restore, and
        # nothing worth creating a cookie or touching the DB for yet.
        return TodayGuessesResponse(guesses=[])

    daily_answer = get_or_create_daily_answer(db, date.today())
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


@router.delete("/today", status_code=204)
def reset_today(request: Request, db: Session = Depends(get_db)):
    """Dev-only for now, wired to the Reset button. Previews what the
    automatic midnight reset will eventually do for every player: clears
    this session's guesses against today's still-current secret card,
    without changing what that secret is — a real day change is what
    actually rotates the secret, not this."""
    guest_session_id = request.cookies.get(GUEST_SESSION_COOKIE)
    if not guest_session_id:
        return

    daily_answer = get_or_create_daily_answer(db, date.today())

    db.query(Guess).filter(
        Guess.daily_answer_id == daily_answer.id,
        Guess.guest_session_id == guest_session_id,
    ).delete()
    db.commit()
