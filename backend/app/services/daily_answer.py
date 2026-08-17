import random
from datetime import date
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.card import Card
from app.models.daily_answer import DailyAnswer
from app.models.answer_pool import AnswerPool


# daily answer will cycle through the whole bank once, then allow repeats

def get_or_create_daily_answer(db: Session, today: date) -> DailyAnswer:
    existing = db.query(DailyAnswer).filter(DailyAnswer.date == today).first()
    if existing:
        return existing

    current_cycle = db.query(func.max(AnswerPool.cycle_number)).scalar() or 0
    remaining = db.query(AnswerPool).filter(AnswerPool.cycle_number == current_cycle).all()

    if not remaining:
        current_cycle += 1
        eligible_cards = db.query(Card).filter(Card.is_playable == 1).all()
        shuffled = random.sample(eligible_cards, len(eligible_cards))
        for card in shuffled:
            db.add(AnswerPool(card_id=card.id, cycle_number=current_cycle))
        db.commit()
        remaining = db.query(AnswerPool).filter(AnswerPool.cycle_number == current_cycle).all()

    chosen_entry = remaining[0]
    chosen_card_id = chosen_entry.card_id

    db.delete(chosen_entry)
    new_answer = DailyAnswer(date=today, card_id=chosen_card_id)
    db.add(new_answer)
    db.commit()
    return new_answer