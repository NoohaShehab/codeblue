"""Replaceable forecasting adapter. Swap MockForecastingAdapter without changing LangGraph."""

from ai.integrations.forecasting import ForecastingAdapter, MockForecastingAdapter, get_forecasting_adapter, get_forecast

__all__ = ["ForecastingAdapter", "MockForecastingAdapter", "get_forecasting_adapter", "get_forecast"]
