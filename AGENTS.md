# Clashdle Agent Guide

Clashdle is a Wordle-style guessing game for Clash Royale cards. Players guess a daily card and receive higher/lower/match feedback across card stats. The backend owns the secret answer and comparison logic; the frontend renders guesses, stats, auth, and game UI.

## Current State

- Scraped Clash Royale card data is already collected and normalized. `all_cards.json` and `frontend/src/data/all_cards.json` are the source data artifacts; `backend/scripts/load_cards.py` loads cards into Postgres.
- Backend is a FastAPI app with SQLAlchemy models, Alembic migrations, JWT auth, daily game endpoints, Unlimited mode endpoints, leaderboards, and stats services.
- Frontend is a React + Vite + TypeScript app deployed on Vercel. It has daily play, refresh-proof guesses, auth/profile modal, stats panel, card browser, leaderboard modal, previous-answer footer, and Unlimited mode.
- PostgreSQL is hosted on Railway. Frontend hosting is Vercel.

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic, PostgreSQL.
- Auth: JWT access tokens signed with HS256, `passlib` password hashing, optional login.
- Frontend: React, Vite, TypeScript, React Router, Vercel Analytics.
- Deployment: frontend on Vercel; backend and database on Railway.
- Local environment: Windows workspace. Prefer PowerShell-safe commands.

## Run Commands

Frontend:

```powershell
cd frontend
npm install
npm run dev
npm run build
npm run lint
```

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
alembic upgrade head
```

Backend configuration is read from `backend/.env` via `backend/app/core/config.py`. Required values:

```env
DATABASE_URL=...
JWT_SECRET_KEY=...
```

Frontend API calls use `VITE_API_BASE_URL`, falling back to `http://localhost:8000`.

## Important Design Decisions

- Guests can play without login. Daily guest guesses are persisted server-side by an opaque client-generated `X-Guest-Session-Id` header, not by cookies.
- Guest aggregate stats live in localStorage. Registered-user aggregate stats live server-side in `user_stats`.
- On registration, the frontend sends uncredited guest stats and the current guest session id. The backend seeds `user_stats` and transfers matching guest guess rows to the new account.
- JWT tokens expire after 24 hours to match the daily cadence without a refresh-token flow.
- Daily answer selection is server-side. The answer pool cycles through playable cards before repeats.
- "Today" is based on the browser's IANA timezone from `X-Timezone`, with a fallback timezone in `backend/app/core/time.py`.
- The backend returns only comparison feedback, never the secret card's full stats.
- Daily play has `MAX_GUESSES = 8`; keep frontend constants and backend constants in sync.
- Unlimited mode is logged-in only and is gated behind finishing today's daily game. Active Unlimited rounds are ephemeral and deleted once won or lost.
- Avoid hardcoded card-specific fixes. Prefer generic data/script-level logic unless a card exception is truly unavoidable.

## Backend Map

- `backend/app/main.py`: FastAPI app, CORS, router registration.
- `backend/app/core/config.py`: env-backed settings.
- `backend/app/core/security.py`: JWT and password helpers.
- `backend/app/core/time.py`: per-request timezone handling.
- `backend/app/models/`: SQLAlchemy models for users, cards, daily answers, guesses, stats, answer pool, and Unlimited mode.
- `backend/app/routers/game.py`: daily guess, restore, winners count, previous answer.
- `backend/app/routers/auth.py`: register, login, profile, user stats.
- `backend/app/routers/unlimited.py`: current/start/guess/stats for Unlimited mode.
- `backend/app/routers/leaderboard.py`: public leaderboard.
- `backend/app/services/game.py`: authoritative comparison logic.
- `backend/app/services/daily_answer.py`: answer-pool daily selection and daily-finished checks.
- `backend/app/services/user_stats.py`: daily stats and streak updates.
- `backend/app/services/unlimited.py`: active Unlimited round creation/restoration.
- `backend/app/services/unlimited_stats.py`: Unlimited aggregate stats.
- `backend/scripts/load_cards.py`: load scraped card data into Postgres.

## Frontend Map

- `frontend/src/main.tsx`: routes for `/`, `/unlimited`, and fallback 404.
- `frontend/src/App.tsx`: daily game page and modal orchestration.
- `frontend/src/UnlimitedPage.tsx`: logged-in Unlimited mode flow.
- `frontend/src/api/`: typed API clients that mirror backend schemas.
- `frontend/src/utils/guestSession.ts`: guest identity header storage.
- `frontend/src/utils/guessHistogram.ts`: guest daily histogram and loss stats.
- `frontend/src/utils/streak.ts`: guest streak state.
- `frontend/src/utils/guestStatsCredit.ts`: prevents repeatedly crediting the same guest stats to multiple accounts.
- `frontend/src/components/`: UI components for search, cards, stats, profile, leaderboard, browser, help, streak, and footer.
- `frontend/public/card_images/` and `frontend/public/card_images_trimmed/`: card image assets.

## Coding Preferences

- Keep changes scoped to the requested behavior.
- Follow the existing file and naming patterns before introducing new abstractions.
- Keep backend schemas and frontend API TypeScript interfaces in sync.
- Use migrations for database shape changes.
- Preserve guest play as frictionless; login should add sync and Unlimited access, not block the daily game.
- Be careful with timezone-dependent behavior. Tests or manual checks should use explicit dates/timezones where possible.
- Keep explanations direct, especially for React/auth details.
- Do not touch unrelated uncommitted changes. Check `git status --short` before editing.

## Verification Checklist

Use the smallest useful set for the change:

- Frontend build: `cd frontend; npm run build`
- Frontend lint: `cd frontend; npm run lint`
- Backend import/server smoke test: `cd backend; uvicorn app.main:app --reload`
- Database changes: `cd backend; alembic upgrade head`
- Auth/manual flows: guest daily, register after guest play, login, logout, stats restore.
- Daily/manual flows: refresh after guesses, win, loss after 8 guesses, previous answer, timezone behavior.
- Unlimited/manual flows: blocked before finishing daily, start after finishing daily, restore in-progress round, win/loss stats.

## Next Steps

1. Add focused backend tests for `services/game.py`, `services/user_stats.py`, `services/daily_answer.py`, and Unlimited stats.
2. Add API integration tests for guest daily play, logged-in play, registration stat transfer, and Unlimited gating.
3. Add a seed/dev database workflow so a fresh clone can load cards and create a playable local app quickly.
4. Add a small health/debug endpoint or script that verifies database connectivity, card count, answer-pool state, and current daily answer row.
5. Improve frontend error handling for failed guesses, expired tokens, and failed stats/profile loads.
6. Add a visible account/session state for expired JWTs so users are cleanly logged out instead of silently failing API calls.
7. Make daily/Unlimited constants shared or generated from one source to avoid backend/frontend `MAX_GUESSES` drift.
8. Add Playwright smoke tests for the daily page, auth modal, stats modal, leaderboard modal, card browser, and Unlimited page.
9. Document Railway and Vercel deployment steps, including required env vars and post-deploy card-loading/migration commands.
10. Consider a previous-answers/archive page once enough daily answers exist.
