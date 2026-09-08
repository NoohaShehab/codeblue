from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class NlpResult(BaseModel):
    intent: str
    department: Optional[str] = None
    entities: Dict[str, Any] = Field(default_factory=dict)
    severity: str = "medium"
    confidence: float = 0.0
    source: str = "mock"
    available: bool = True
