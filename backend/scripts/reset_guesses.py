"""Emergency dev-side tool for clearing Guess rows.

Deliberately not wired to any button or API endpoint — there's no auth yet,
so anything reachable over HTTP that can delete data is reachable by anyone
who finds it. This only runs when you run it, against whatever DB
SessionLocal / DATABASE_URL points at.

Usage (from backend/, with .venv active):
    python scripts/reset_guesses.py                             # today, all players
    python scripts/reset_guesses.py --date 2026-08-25            # a specific date, all players
    python scripts/reset_guesses.py --guest-session-id <uuid>    # today, one player only
    python scripts/reset_guesses.py --date 2026-08-25 --yes      # skip the confirmation prompt
"""
import argparse
import sys
from datetime import date, datetime
from pathlib import Path

# allow `from app...` imports when this file is run directly as a script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.daily_answer import DailyAnswer
from app.models.guess import Guess


def parse_args():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--date", type=str, default=None, help="YYYY-MM-DD, defaults to today")
    parser.add_argument(
        "--guest-session-id",
        type=str,
        default=None,
        help="Limit to one player's guesses; omit to clear everyone's for that date",
    )
    parser.add_argument("--yes", action="store_true", help="Skip the confirmation prompt")
    return parser.parse_args()


def main():
    args = parse_args()
    target_date = (
        datetime.strptime(args.date, "%Y-%m-%d").date() if args.date else date.today()
    )

    db = SessionLocal()
    try:
        daily_answer = db.query(DailyAnswer).filter(DailyAnswer.date == target_date).first()
        if daily_answer is None:
            print(f"No daily answer exists for {target_date} — nothing to delete.")
            return

        query = db.query(Guess).filter(Guess.daily_answer_id == daily_answer.id)
        if args.guest_session_id:
            query = query.filter(Guess.guest_session_id == args.guest_session_id)

        count = query.count()
        if count == 0:
            scope = f" / session {args.guest_session_id}" if args.guest_session_id else ""
            print(f"No guesses found for {target_date}{scope}.")
            return

        scope = f"guest session {args.guest_session_id}" if args.guest_session_id else "ALL players"
        print(f"About to delete {count} guess(es) for {target_date} ({scope}).")

        if not args.yes:
            confirm = input("Type 'yes' to continue: ")
            if confirm.strip().lower() != "yes":
                print("Aborted.")
                return

        query.delete(synchronize_session=False)
        db.commit()
        print(f"Deleted {count} guess(es).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
