from typing import List, Optional

from pydantic import BaseModel, Field


class SpecialistAnalysis(BaseModel):
    agent: str
    summary: str
    findings: List[str] = Field(default_factory=list)
    bottlenecks: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    alerts: List[str] = Field(default_factory=list)
    data_used: List[str] = Field(default_factory=list)


class DecisionResult(BaseModel):
    answer: str
    main_issue: Optional[str] = None
    recommendations: List[str] = Field(default_factory=list)
    alerts: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    requires_human_approval: bool = False
    data_source_notes: List[str] = Field(default_factory=list)
