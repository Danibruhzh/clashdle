from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.leaderboard import AvgGuessesEntry, LeaderboardResponse, StreakEntry, WinsEntry
from app.services.leaderboard import get_top_avg_guesses, get_top_streak, get_top_wins

router = APIRouter(tags=["leaderboard"])


@router.get("/leaderboard", response_model=LeaderboardResponse)
def leaderboard(db: Session = Depends(get_db)):
    # Public — no login required to view (same as /game/today/winners),
    # even though only registered accounts ever appear in it (guests have
    # no server-side stats to rank at all).
    return LeaderboardResponse(
        top_streak=[StreakEntry(username=u, best_streak=s) for u, s in get_top_streak(db)],
        top_wins=[WinsEntry(username=u, wins=w) for u, w in get_top_wins(db)],
        top_avg_guesses=[AvgGuessesEntry(username=u, avg_guesses=a) for u, a in get_top_avg_guesses(db)],
    )
