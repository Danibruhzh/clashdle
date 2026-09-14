# app/models/guess.py
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Guess(Base):
    __tablename__ = "guesses"

    id = Column(Integer, primary_key=True, index=True)
    daily_answer_id = Column(Integer, ForeignKey("daily_answers.id"), nullable=False, index=True)
    guessed_card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)

    # Identifies who can restore this guess. Fresh guest guesses have only
    # guest_session_id; logged-in guesses have only user_id. A guest guess
    # claimed during signup keeps guest_session_id and also gets user_id so
    # logout still restores the browser's guest game.
    guest_session_id = Column(String, nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    is_correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    daily_answer = relationship("DailyAnswer")
    guessed_card = relationship("Card")

    def __repr__(self):
        return f"<Guess id={self.id} daily_answer_id={self.daily_answer_id} correct={self.is_correct}>"
