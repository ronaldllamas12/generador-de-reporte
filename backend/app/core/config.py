import sys
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = Path(__file__).resolve().parents[2]
STATIC_DIR = APP_DIR / "static"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    project_name: str = "Generador de Reportes"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = (
        "postgresql+asyncpg://postgres:admin@localhost:5433/reportes"
        if sys.version_info < (3, 14)
        else "postgresql+psycopg://postgres:admin@localhost:5433/reportes"
    )
    uploads_dir: str = str(STATIC_DIR / "uploads" / "evidence")
    reports_dir: str = str(STATIC_DIR / "reports")
    use_cloudinary_uploads: bool = True
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_folder: str = "generador-reportes"
    database_ssl_mode: str | None = None
    enable_demo_seed: bool = False
    allow_public_registration: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
