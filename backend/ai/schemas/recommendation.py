from typing import List, Literal, Optional

from pydantic import BaseModel, Field


RecommendationPriority = Literal[
    "low",
    "medium",
    "high",
    "critical",
]

RecommendationStatus = Literal[
    "recommended",
    "monitor",
    "requires_approval",
]


class RecommendationItem(BaseModel):
    action_id: str = Field(
        description="ID from the CodeBlue action library"
    )

    action: str = Field(
        description="Concrete operational action to take"
    )

    priority: RecommendationPriority = Field(
        description="Operational priority of the recommendation"
    )

    reason: str = Field(
        description="Why this action is recommended based on verified signals"
    )

    signals: List[str] = Field(
        default_factory=list,
        description="Verified signals supporting this recommendation"
    )

    expected_impact: str = Field(
        description="Expected operational impact"
    )

    owner: str = Field(
        description="Department or operational owner responsible"
    )

    status: RecommendationStatus = Field(
        description="Current recommendation status"
    )


class Recommendation(BaseModel):
    summary: str = Field(
        description="Short hospital-wide operational summary"
    )

    focus_areas: List[str] = Field(
        default_factory=list,
        description="Main departments or operational areas under pressure"
    )

    recommendations: List[RecommendationItem] = Field(
        default_factory=list,
        description="Concrete ranked operational recommendations"
    )

    priority: RecommendationPriority
    department: Optional[str] = None
    action: str
    reason: str
    signals: List[str] = Field(default_factory=list)
    expected_impact: str
    owner: str
    status: RecommendationStatus