from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


Severity = Literal["critical", "watch", "stable"]


class EvidenceItem(BaseModel):
    label: str
    value: Any
    source: str


class Insight(BaseModel):
    id: str
    department: str
    severity: Severity
    title: str
    description: str
    evidence: List[EvidenceItem]
    source: str
    as_of: Optional[str] = None
    rank: int


class InsightsSummary(BaseModel):
    critical: int = 0
    watch: int = 0
    stable: int = 0


class InsightsResponse(BaseModel):
    summary: InsightsSummary
    insights: List[Insight]
