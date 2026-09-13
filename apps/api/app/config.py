from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    database_url: str = "postgresql+psycopg://apm:apm_dev_password@localhost:5433/apm_dev"
    redis_url: str = "redis://localhost:6380/0"

    jwt_secret_key: str = "change-me-in-production-use-a-random-32-plus-byte-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    magic_link_expire_minutes: int = 30

    storage_backend: str = "local"
    storage_local_root: str = "../../uploads"
    upload_max_bytes: int = 25 * 1024 * 1024

    # Free OpenStreetMap Nominatim geocoding for property addresses — no API
    # key, no billing. Off by default in tests (see conftest.py) so the
    # existing suite's many POST /properties calls never hit the network.
    geocoding_enabled: bool = True
    geocoding_user_agent: str = "AIPropertyManager/1.0"

    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
