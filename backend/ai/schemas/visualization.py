from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ChartPoint(BaseModel):
    label: str
    value: float
    series: Optional[str] = None


class ChartSpec(BaseModel):
    type: Literal["bar", "line", "table", "gauge"] = "bar"
    title: str
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    data: List[ChartPoint] = Field(default_factory=list)


class MetricCard(BaseModel):
    label: str
    value: float
    baseline: Optional[float] = None
    scenario: Optional[float] = None
    unit: str = ""
    source: str = "observed"


class VisualizationSpec(BaseModel):
    type: Literal["snapshot", "comparison", "forecast", "empty"] = "snapshot"
    title: str = "Hospital operations"
    charts: List[ChartSpec] = Field(default_factory=list)
    metrics: List[MetricCard] = Field(default_factory=list)
    tables: List[Dict[str, Any]] = Field(default_factory=list)
