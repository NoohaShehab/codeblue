from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ScenarioInput(BaseModel):
    """What-if levers. Arrival change is a fraction (0.20 = +20%)."""

    er_arrivals_change: float = Field(default=0.0, ge=-0.5, le=1.0)
    icu_beds_unavailable: int = Field(default=0, ge=-5, le=20)
    additional_icu_admissions: int = Field(default=0, ge=-20, le=20)
    delayed_discharges: int = Field(default=0, ge=-20, le=20)
    department: Optional[str] = None
    action_id: Optional[str] = None

    @field_validator("er_arrivals_change", mode="before")
    @classmethod
    def normalize_percent(cls, value):
        if value is None:
            return 0.0
        value = float(value)
        # Accept UI percentages like 20 meaning +20%.
        if abs(value) > 1.0:
            return value / 100.0
        return value


def scenario_from_sliders(
    er_arrival_delta_percent: float = 0,
    icu_bed_reduction: int = 0,
    icu_admission_delta: int = 0,
    delayed_discharges: int = 0,
) -> ScenarioInput:
    return ScenarioInput(
        er_arrivals_change=er_arrival_delta_percent / 100.0,
        icu_beds_unavailable=int(icu_bed_reduction),
        additional_icu_admissions=int(icu_admission_delta),
        delayed_discharges=int(delayed_discharges),
    )