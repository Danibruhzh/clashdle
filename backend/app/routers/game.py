from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.card import Card
from app.schemas.guess import GuessedCard, GuessRequest, GuessResponse
from app.services.daily_answer import get_or_create_daily_answer
from app.services.game import compare_cards, is_correct_guess

router = APIRouter(prefix="/game", tags=["game"])


@router.post("/guess", response_model=GuessResponse)
def guess(payload: GuessRequest, db: Session = Depends(get_db)):
    guessed_card = db.query(Card).filter(Card.name == payload.guess_name).first()
    if guessed_card is None:
        raise HTTPException(status_code=404, detail=f"No card named '{payload.guess_name}'")

    daily_answer = get_or_create_daily_answer(db, date.today())
    secret_card = daily_answer.card

    comparisons = compare_cards(secret_card, guessed_card)
    correct = is_correct_guess(comparisons)

    card_data = GuessedCard(
        name=guessed_card.name,
        cost=guessed_card.cost,
        type=guessed_card.type,
        rarity=guessed_card.rarity,
        target=guessed_card.target,
        hitpoints_raw=guessed_card.hitpoints_raw,
        damage_raw=guessed_card.damage_raw,
        damage_stage_label=guessed_card.damage_stage_label,
        dps_raw=guessed_card.dps_raw,
        dps_stage_label=guessed_card.dps_stage_label,
        special_damage_raw=guessed_card.special_damage_raw,
        special_damage_label=guessed_card.special_damage_label,
    )

    return GuessResponse(card=card_data, comparisons=comparisons, correct=correct)
