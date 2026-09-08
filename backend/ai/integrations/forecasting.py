from abc import ABC, abstractmethod
from typing import Optional

from ai.config import get_settings, logger
from ai.schemas.forecast import ForecastPoint, ForecastResult


class ForecastingAdapter(ABC):
    """Stable contract. Real forecasting team should implement this class."""

    @abstractmethod
    def get_forecast(
        self,
        department: str,
        horizon_hours: int = 12,
        metric: str = "patient_arrivals",
    ) -> ForecastResult:
        raise NotImplementedError


class MockForecastingAdapter(ForecastingAdapter):
    def get_forecast(
        self,
        department: str,
        horizon_hours: int = 12,
        metric: str = "patient_arrivals",
    ) -> ForecastResult:
        settings = get_settings()
        dept = (department or "ER").upper()
        if dept in {"ICU", "INTENSIVE CARE UNIT"} and metric in {"occupancy", "icu_occupancy", "patient_arrivals"}:
            loaded = _load_icu_json(settings.forecast_json_path, horizon_hours)
            if loaded:
                return loaded
        return ForecastResult(
            department=dept,
            metric=metric,
            horizon_hours=horizon_hours,
            predicted_values=[],
            confidence=0.0,
            source="mock",
            notes="Mock adapter: no numeric forecast series generated. Replace MockForecastingAdapter with the real model.",
            available=True,
        )


def _load_icu_json(path: str, horizon_hours: int) -> Optional[ForecastResult]:
    import json
    import os

    if not path or not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
        series = payload.get("forecast") or []
        points = []
        for row in series[:horizon_hours]:
            points.append(
                ForecastPoint(
                    timestamp=str(row.get("timestamp")),
                    value=float(row.get("predicted_occupancy", 0)),
                    lower_bound=row.get("lower_bound"),
                    upper_bound=row.get("upper_bound"),
                )
            )
        return ForecastResult(
            department="ICU",
            metric="icu_occupancy",
            horizon_hours=horizon_hours,
            predicted_values=points,
            confidence=0.85,
            source=str(payload.get("model") or "mock"),
            peak_value=payload.get("peak_occupancy"),
            peak_time=payload.get("peak_time"),
            notes="Loaded from forecasting JSON adapter. Treat as Forecast, not observed occupancy.",
        )
    except Exception as exc:
        logger.warning("Forecast JSON load failed: %s", type(exc).__name__)
        return None


_ADAPTER: Optional[ForecastingAdapter] = None


def get_forecasting_adapter() -> ForecastingAdapter:
    global _ADAPTER
    if _ADAPTER is None:
        _ADAPTER = MockForecastingAdapter()
    return _ADAPTER


def set_forecasting_adapter(adapter: ForecastingAdapter) -> None:
    global _ADAPTER
    _ADAPTER = adapter


def get_forecast(department: str, horizon_hours: int = 12, metric: str = "patient_arrivals") -> ForecastResult:
    try:
        return get_forecasting_adapter().get_forecast(department, horizon_hours, metric)
    except Exception as exc:
        logger.warning("Forecasting adapter unavailable: %s", type(exc).__name__)
        return ForecastResult(
            department=department,
            metric=metric,
            horizon_hours=horizon_hours,
            predicted_values=[],
            confidence=0.0,
            source="unavailable",
            available=False,
            notes="Forecasting adapter failed; continuing without a forecast.",
        )
