import json
from typing import List

from pydantic import AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: AnyUrl
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"

    # Default GM and HR accounts, created at startup when no active account of
    # that role exists (see app.services.bootstrap_service). Set your own
    # passwords in the host's environment: these fallbacks are public.
    DEFAULT_GM_IDENTIFIER: str = "gen"
    DEFAULT_GM_PASSWORD: str = "123456"
    DEFAULT_GM_NAME: str = "General Manager"
    DEFAULT_HR_IDENTIFIER: str = "hum"
    DEFAULT_HR_PASSWORD: str = "123456"
    DEFAULT_HR_NAME: str = "Human Resource"
    # One-time lockout fix: set to true, restart, then remove it. Resets the
    # two default accounts above to their configured passwords.
    RESET_ADMIN_PASSWORDS: bool = False

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @property
    def cors_origins(self) -> List[str]:
        value = (self.BACKEND_CORS_ORIGINS or "").strip()
        if not value:
            return []

        if value.startswith("[") and value.endswith("]"):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [origin.strip() for origin in parsed if isinstance(origin, str) and origin.strip()]
                if isinstance(parsed, str):
                    return [parsed.strip()] if parsed.strip() else []
            except ValueError:
                pass

        return [origin.strip() for origin in value.split(",") if origin.strip()]


settings = Settings()
