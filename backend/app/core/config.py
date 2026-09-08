from pathlib import Path

from pydantic_settings import BaseSettings

# Anchored to this file's location (backend/app/core/config.py -> backend/.env)
# rather than a bare ".env", so it resolves correctly no matter what the
# current working directory is when the process starts.
ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    # 24 hours — matches the game's daily cadence (log in once, play, come
    # back tomorrow) rather than a short-lived session, per CLAUDE.md.
    access_token_expire_minutes: int = 60 * 24

    class Config:
        env_file = ENV_FILE

settings = Settings()