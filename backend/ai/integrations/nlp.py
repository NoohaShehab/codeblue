from abc import ABC, abstractmethod
from typing import Optional

from ai.config import logger
from ai.graph.routing import fallback_route, normalize_department
from ai.schemas.nlp import NlpResult


class NlpAdapter(ABC):
    @abstractmethod
    def parse(self, query: str) -> NlpResult:
        raise NotImplementedError


class MockNlpAdapter(NlpAdapter):
    def parse(self, query: str) -> NlpResult:
        route = fallback_route(query)
        entities = {}
        q = (query or "").lower()
        if "bed" in q:
            entities["resource"] = "beds"
        elif "nurse" in q or "staff" in q:
            entities["resource"] = "staff"
        elif "equipment" in q or "ventilator" in q:
            entities["resource"] = "equipment"
        severity = "high" if any(w in q for w in ["overcrowd", "critical", "shortage"]) else "medium"
        return NlpResult(
            intent=route.intent,
            department=normalize_department(route.department),
            entities=entities,
            severity=severity,
            confidence=0.55,
            source="mock",
        )


_ADAPTER: Optional[NlpAdapter] = None


def get_nlp_adapter() -> NlpAdapter:
    global _ADAPTER
    if _ADAPTER is None:
        _ADAPTER = MockNlpAdapter()
    return _ADAPTER


def set_nlp_adapter(adapter: NlpAdapter) -> None:
    global _ADAPTER
    _ADAPTER = adapter


def parse_query(query: str) -> NlpResult:
    try:
        return get_nlp_adapter().parse(query)
    except Exception as exc:
        logger.warning("NLP adapter unavailable: %s", type(exc).__name__)
        return NlpResult(
            intent="operational_question",
            department=None,
            entities={},
            severity="medium",
            confidence=0.0,
            source="unavailable",
            available=False,
        )
