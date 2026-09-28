from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401, load models before request handling
from app.routers import auth, game, leaderboard, unlimited

app = FastAPI(title="Clashdle API")

# The frontend calls this API from Vite locally and Vercel in production.
# Guest identity travels as a plain header instead of a cookie, so these
# browser calls do not need credentialed CORS.
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
app.include_router(auth.router)
app.include_router(unlimited.router)
app.include_router(leaderboard.router)


@app.get("/")
def root():
    return {"status": "ok"}
