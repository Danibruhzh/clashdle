"""Which day's card a request is playing is decided by the timezone *that
request* declares (see the X-Timezone header sent by frontend/src/api/game.ts,
via Intl.DateTimeFormat().resolvedOptions().timeZone) — not one fixed
timezone for every player. Two players in different zones can legitimately
be looking at two different DailyAnswer rows at the same real-world moment;
get_or_create_daily_answer() doesn't care what order dates get created in.

This only decides *which day's card* is in play, never anything about that
card's actual stats — the thing the backend exists to protect. A player can
already only lie about their own timezone to reach a different still-fully-
hidden card sooner, the same way changing your system clock has always let
you reach tomorrow's word early in the real Wordle.

zoneinfo needs the `tzdata` package (see requirements.txt) to resolve zone
names on Windows and on minimal Linux images that don't ship the IANA
database themselves.
"""
from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Header

# Used only when a request doesn't declare a timezone at all (a client that
# predates this, or the header failing to resolve) — never authoritative
# once a real per-request zone comes through.
FALLBACK_TIMEZONE = ZoneInfo("America/New_York")


def default_today() -> date:
    """"Today" with no per-request timezone available — e.g. scripts/
    reset_guesses.py, which runs outside any HTTP request."""
    return datetime.now(FALLBACK_TIMEZONE).date()


def today_in(timezone_name: str) -> date | None:
    """Today's date in an IANA timezone name, or None if the name doesn't
    resolve (unrecognized string, typo, etc.)."""
    try:
        return datetime.now(ZoneInfo(timezone_name)).date()
    except ZoneInfoNotFoundError:
        return None


def get_client_today(x_timezone: str | None = Header(default=None, alias="X-Timezone")) -> date:
    """FastAPI dependency: resolves "today" from the requesting client's own
    declared timezone, falling back to FALLBACK_TIMEZONE if it's missing or
    unrecognized."""
    if x_timezone:
        resolved = today_in(x_timezone)
        if resolved is not None:
            return resolved
    return default_today()
