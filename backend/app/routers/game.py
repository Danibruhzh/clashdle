import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.card import Card
from app.models.guess import Guess
from app.schemas.guess import GuessRequest, GuessResponse
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
