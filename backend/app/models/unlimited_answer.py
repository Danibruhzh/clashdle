# app/models/unlimited_answer.py
from sqlalchemy import Column, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class UnlimitedAnswer(Base):
    """A user's currently in-progress Unlimited round — unlike DailyAnswer,
    this is ephemeral: routers/unlimited.py deletes this row (and its
    UnlimitedGuess rows) the instant a round finishes, win or loss, so it
    only ever represents "the round this user is on right now", never
    history. user_id is unique for exactly that reason — at most one active
    round per account at a time (see UnlimitedGuess for why user_id can be
    required here in a way the daily Guess model's can't).
    """

    __tablename__ = "unlimited_answers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
    card = relationship("Card")

    def __repr__(self):
        return f"<UnlimitedAnswer user_id={self.user_id} card_id={self.card_id}>"
