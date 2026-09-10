# app/models/unlimited_guess.py
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class UnlimitedGuess(Base):
    """One guess within a user's current Unlimited round — mirrors the
    daily Guess model, but simpler: Unlimited requires login (see
    routers/unlimited.py), so there's no guest_session_id branch, and rows
    here get deleted along with their UnlimitedAnswer the moment the round
    finishes (see that model's docstring) rather than kept indefinitely."""

    __tablename__ = "unlimited_guesses"

    id = Column(Integer, primary_key=True, index=True)
    unlimited_answer_id = Column(Integer, ForeignKey("unlimited_answers.id"), nullable=False, index=True)
    guessed_card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    is_correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    unlimited_answer = relationship("UnlimitedAnswer")
    guessed_card = relationship("Card")

    def __repr__(self):
        return f"<UnlimitedGuess id={self.id} unlimited_answer_id={self.unlimited_answer_id} correct={self.is_correct}>"
