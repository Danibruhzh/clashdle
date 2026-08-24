from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 — registers every model on Base.metadata before any request runs
from app.routers import game

app = FastAPI(title="Clashdle API")

# The frontend runs on Vite's dev server locally and on Vercel in production.
# Guests call this API directly from the browser with no auth, so CORS has
# to explicitly allow both origins. allow_credentials=True is required for
# the guest-session cookie (see routers/game.py) to be sent/received at all
# on cross-origin requests — and can't be combined with a "*" origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://clashdle-navy.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(game.router)


@app.get("/")
def root():
    return {"status": "ok"}
