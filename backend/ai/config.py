import logging
import os
from functools import lru_cache

from dotenv import load_dotenv

# Load repo-root .env and backend/.env if present.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ROOT_DIR = os.path.dirname(_BACKEND_DIR)
load_dotenv(os.path.join(_ROOT_DIR, ".env"))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))

logger = logging.getLogger("codeblue.ai")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] codeblue.ai: %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


class AISettings:
    openai_api_key: str
    openai_model: str
    temperature: float
    mock_mode: bool
    disable_llm: bool
    forecast_json_path: str

    def __init__(self) -> None:
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.temperature = float(os.getenv("OPENAI_TEMPERATURE", "0"))
        self.mock_mode = os.getenv("AI_MOCK_MODE", "true").lower() in {"1", "true", "yes"}
        self.disable_llm = os.getenv("AI_DISABLE_LLM", "false").lower() in {"1", "true", "yes"}
        default_forecast = os.path.join(os.path.dirname(__file__), "integrations", "mock_icu_forecast.json")
        self.forecast_json_path = os.getenv("FORECAST_JSON_PATH", default_forecast)

    @property
    def llm_enabled(self) -> bool:
        return bool(self.openai_api_key) and not self.disable_llm


@lru_cache(maxsize=1)
def get_settings() -> AISettings:
    return AISettings()
