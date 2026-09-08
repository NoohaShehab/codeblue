from typing import List, Literal, Optional

from pydantic import BaseModel, Field

Intent = Literal[
    "operational_question",
    "capacity_analysis",
    "resource_analysis",
    "patient_flow_analysis",
    "equipment_analysis",
    "staff_analysis",
    "clinical_information",
    "what_if_simulation",
    "comparison",
    "general_hospital_question",
    "unsupported",
]

SpecialistName = Literal["operations_agent", "resource_agent", "clinical_agent"]


class RoutingDecision(BaseModel):
    intent: Intent = "general_hospital_question"
    department: Optional[str] = Field(
        default=None,
        description="ER, ICU, Emergency Room, Intensive Care Unit, or null if hospital-wide",
    )
    agents: List[SpecialistName] = Field(default_factory=list)
    priority: Literal["low", "medium", "high"] = "medium"
    missing_information: List[str] = Field(default_factory=list)
    reason: str = ""
    requires_human_approval: bool = False
