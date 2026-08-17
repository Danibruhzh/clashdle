# app/models/daily_answer.py
from sqlalchemy import Column, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class DailyAnswer(Base):
    __tablename__ = "daily_answers"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)

    card = relationship("Card")