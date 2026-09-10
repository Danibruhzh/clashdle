"""Starts/fetches a user's current Unlimited round. Unlike daily_answer.py,
selection here is genuinely random on every call (see the "completely
random" requirement this was built to) rather than a no-repeat-until-
exhausted pool — repeats across rounds are expected and fine."""
import random

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.card import Card
from app.models.unlimited_answer import UnlimitedAnswer


def get_active_round(db: Session, user_id: int) -> UnlimitedAnswer | None:
    return (
        db.query(UnlimitedAnswer)
        .options(joinedload(UnlimitedAnswer.card))
        .filter(UnlimitedAnswer.user_id == user_id)
        .first()
    )


def start_new_round(db: Session, user_id: int) -> UnlimitedAnswer:
    """Idempotent: if a round is somehow already active for this user (a
    double-clicked Play Again, two tabs), returns that one instead of
    erroring or creating a second — unlimited_answers.user_id is unique, so
    a genuine race just loses to whichever request commits first."""
    existing = get_active_round(db, user_id)
    if existing:
        return existing

    eligible_card_ids = [row[0] for row in db.query(Card.id).filter(Card.is_playable.is_(True)).all()]
    chosen_card_id = random.choice(eligible_card_ids)

    round_ = UnlimitedAnswer(user_id=user_id, card_id=chosen_card_id)
    db.add(round_)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return get_active_round(db, user_id)

    db.refresh(round_)
    return round_
