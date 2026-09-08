from typing import Any, Dict, List, Optional

from ai.schemas.routing import RoutingDecision
from ai.graph.state import HospitalState


def normalize_department(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    raw = name.strip().lower()
    if raw in {"er", "emergency", "emergency room", "ed"}:
        return "ER"
    if raw in {"icu", "intensive care", "intensive care unit"}:
        return "ICU"
    return name.strip()


def fallback_route(query: str, prior_department: Optional[str] = None, has_scenario: bool = False) -> RoutingDecision:
    """Keyword router used when the LLM is unavailable or fails."""
    q = (query or "").lower()
    department = prior_department
    for token, dept in [
        ("icu", "ICU"),
        ("intensive care", "ICU"),
        ("er", "ER"),
        ("emergency", "ER"),
    ]:
        if token in q:
            department = dept
            break

    if has_scenario or "what if" in q or "what-if" in q or "simulate" in q or "increase" in q and "arrival" in q:
        return RoutingDecision(
            intent="what_if_simulation",
            department=department or prior_department or "ER",
            agents=["operations_agent", "resource_agent"],
            priority="high",
            reason="Scenario / what-if language detected.",
        )

    if any(w in q for w in ["diagnos", "prescribe", "medication dose", "treat this patient"]):
        return RoutingDecision(
            intent="unsupported",
            department=department,
            agents=[],
            priority="low",
            reason="Clinical diagnosis or prescribing is out of scope.",
            missing_information=[],
        )

    if any(w in q for w in ["equipment", "ventilator", "monitor", "device"]):
        return RoutingDecision(
            intent="equipment_analysis",
            department=department,
            agents=["resource_agent"],
            priority="medium",
            reason="Question focuses on equipment.",
        )

    if any(w in q for w in ["nurse", "staff", "doctor", "workforce", "shift"]):
        return RoutingDecision(
            intent="staff_analysis",
            department=department,
            agents=["resource_agent"],
            priority="medium",
            reason="Question focuses on staffing.",
        )

    if any(w in q for w in ["triage", "clinical note", "chief complaint", "severity mix"]):
        return RoutingDecision(
            intent="clinical_information",
            department=department,
            agents=["clinical_agent", "operations_agent"],
            priority="medium",
            reason="Question asks for clinical-context operational summary.",
        )

    if any(w in q for w in ["bed", "available", "occupancy", "capacity", "overcrowd", "shortage"]):
        agents: List[str] = ["operations_agent", "resource_agent"]
        return RoutingDecision(
            intent="capacity_analysis",
            department=department,
            agents=agents,  # type: ignore[arg-type]
            priority="high" if any(w in q for w in ["overcrowd", "critical", "shortage"]) else "medium",
            reason="Capacity / bed availability question.",
        )

    if any(w in q for w in ["flow", "arrival", "admission", "discharge", "transfer", "waiting", "bottleneck"]):
        return RoutingDecision(
            intent="patient_flow_analysis",
            department=department,
            agents=["operations_agent", "resource_agent"],
            priority="high",
            reason="Patient-flow / bottleneck question.",
        )

    return RoutingDecision(
        intent="operational_question",
        department=department or prior_department,
        agents=["operations_agent", "resource_agent"],
        priority="medium",
        reason="General operational question; operations and resources are needed.",
    )


def route_after_supervisor(state: HospitalState) -> str:
    routing: Dict[str, Any] = state.get("routing_decision") or {}
    intent = routing.get("intent") or state.get("intent")
    mode = state.get("mode")
    if mode == "simulate" or intent == "what_if_simulation" or state.get("scenario"):
        return "what_if"
    if intent == "unsupported":
        return "unsupported"
    return "ask"
