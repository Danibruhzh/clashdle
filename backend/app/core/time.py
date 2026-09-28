"""Resolve the daily game date from the requesting player's timezone.

The frontend sends X-Timezone from Intl.DateTimeFormat(). Two players in
different zones can legitimately be on different daily answers at the same
real-world moment, and answer rows do not need to be created in date order.

This only chooses which card is in play. The card's stats stay hidden behind
the normal backend comparison flow.

zoneinfo needs the `tzdata` package (see requirements.txt) to resolve zone
names on Windows and on minimal Linux images that don't ship the IANA
database themselves.
"""
from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Header

# Used only when a request does not provide a timezone.
FALLBACK_TIMEZONE = ZoneInfo("America/New_York")


def default_today() -> date:
    """"Today" when there is no request timezone, such as in scripts."""
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
