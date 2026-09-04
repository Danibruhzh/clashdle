from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 — registers every model on Base.metadata before any request runs
from app.routers import game

app = FastAPI(title="Clashdle API")

# The frontend runs on Vite's dev server locally and on Vercel in production.
# Guests call this API directly from the browser with no auth, so CORS has
# to explicitly allow both origins. Guest identity travels as a plain header
# (see routers/game.py) rather than a cookie — cross-site cookies get
# silently blocked by Safari's ITP regardless of SameSite=None; Secure — so
# allow_credentials isn't needed here; nothing crosses the wire that requires it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://clashdle-navy.vercel.app",
        "https://clashdle.app",
        "https://www.clashdle.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(game.router)


@app.get("/")
def root():
    return {"status": "ok"}
