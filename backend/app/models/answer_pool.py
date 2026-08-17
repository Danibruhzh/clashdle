from sqlalchemy import Column, Integer, ForeignKey
from app.db.base import Base

class AnswerPool(Base):
    __tablename__ = "answer_pool"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    cycle_number = Column(Integer, nullable=False)  # increments each time the bag refills