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
    # None means account sessions stay valid until the user explicitly logs
    # out or clears this browser's site data. Set a minute value in env to
    # re-enable automatic expiry.
    access_token_expire_minutes: int | None = None

    class Config:
        env_file = ENV_FILE

settings = Settings()
