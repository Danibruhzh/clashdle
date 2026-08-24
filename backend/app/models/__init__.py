# Importing this package (or any of its submodules) is what registers every
# model on Base.metadata. Anything with a ForeignKey/relationship pointing at
# another model needs that model imported *somewhere* before request time —
# otherwise SQLAlchemy can't resolve it (see the NoReferencedTableError this
# caused for Guess.user_id -> users.id). app/main.py imports this package on
# startup so the app doesn't depend on import order between routers.
from app.models.answer_pool import AnswerPool
from app.models.card import Card
from app.models.daily_answer import DailyAnswer
from app.models.guess import Guess
from app.models.user import User

__all__ = ["AnswerPool", "Card", "DailyAnswer", "Guess", "User"]
