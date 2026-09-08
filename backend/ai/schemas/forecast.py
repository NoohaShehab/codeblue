from typing import List, Optional

from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    timestamp: str
    value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class ForecastResult(BaseModel):
    department: str
    metric: str
    horizon_hours: int
    predicted_values: List[ForecastPoint] = Field(default_factory=list)
    confidence: float = 0.0
    source: str = "mock"
    peak_value: Optional[float] = None
    peak_time: Optional[str] = None
    notes: Optional[str] = None
    available: bool = True
