import random
from datetime import date
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.card import Card
from app.models.daily_answer import DailyAnswer
from app.models.answer_pool import AnswerPool

# daily answer will cycle through the whole bank once, then allow repeats

def get_or_create_daily_answer(db: Session, today: date) -> DailyAnswer:
    # joinedload fetches the related Card in the same query (one JOIN) instead
    # of the relationship lazy-loading it as a separate round-trip the first
    # time .card is accessed — each round-trip to a remote DB costs real time.
    existing = (
        db.query(DailyAnswer)
        .options(joinedload(DailyAnswer.card))
        .filter(DailyAnswer.date == today)
        .first()
    )
    if existing:
        return existing

    current_cycle = db.query(func.max(AnswerPool.cycle_number)).scalar() or 0
    remaining = db.query(AnswerPool).filter(AnswerPool.cycle_number == current_cycle).all()

    if not remaining:
        current_cycle += 1
        eligible_cards = db.query(Card).filter(Card.is_playable.is_(True)).all()
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
    try:
        db.commit()
    except IntegrityError:
        # Someone else's request for this same date won the race and
        # committed first — daily_answers.date is unique, so ours just
        # failed instead of creating a duplicate. Not an error from the
        # caller's point of view: their request just arrived a moment too
        # late to be the one that creates the row, and the actual row is
        # already sitting there for us to return like `existing` above.
        db.rollback()
        return (
            db.query(DailyAnswer)
            .options(joinedload(DailyAnswer.card))
            .filter(DailyAnswer.date == today)
            .one()
        )
    return new_answer