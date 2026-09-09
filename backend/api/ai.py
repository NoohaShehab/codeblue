import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ai.agents.simulation import interpret_simulation
from ai.graph.workflow import run_query
from ai.schemas.scenario import ScenarioInput
from ai.simulation.simulation_engine import run_simulation
from ai.tools.facts import load_hospital_snapshot


router = APIRouter(prefix="/api/ai", tags=["AI"])
logger = logging.getLogger(__name__)


class AIQueryIn(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    context: Dict[str, Any] | None = None


class AIQueryOut(BaseModel):
    query: str
    routed_to: str | None = None
    agent: str | None = None
    answer: Any = None
    routing_decision: Dict[str, Any] | None = None
    decision: Dict[str, Any] | None = None
    recommendation_agent: str | None = None
    recommendation_summary: str | None = None


class SimulateOut(BaseModel):
    disclaimer: str
    label: str | None = None
    scenario: Dict[str, Any]
    baseline: Dict[str, Any]
    scenario_metrics: Dict[str, Any]
    changes: Dict[str, Any]
    bottlenecks: list[str]
    warnings: list[str]
    pressure: Dict[str, Any] | None = None
    agent: str = "Simulation Agent"
    answer: Optional[str] = None


@router.post("/query", response_model=AIQueryOut)
def query_ai(payload: AIQueryIn):
    try:
        state = run_query(payload.query, recommendation_context=payload.context)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("AI query failed")
        raise HTTPException(status_code=502, detail="AI request failed") from exc

    final_response = state.get("final_response") or {}
    return AIQueryOut(
        query=payload.query,
        routed_to=final_response.get("routed_to"),
        agent=final_response.get("agent"),
        answer=final_response.get("answer"),
        routing_decision=state.get("routing_decision"),
        decision=state.get("decision"),
        recommendation_agent=final_response.get("recommendation_agent"),
        recommendation_summary=final_response.get("recommendation_summary"),
    )


@router.post("/simulate", response_model=SimulateOut)
def simulate_ai(payload: ScenarioInput):
    try:
        snapshot = load_hospital_snapshot()
        result = run_simulation(snapshot, payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Simulation failed") from exc

    answer = None
    try:
        answer = interpret_simulation(result, snapshot)
    except Exception:
        answer = None
    if not answer:
        metrics = result.get("scenario_metrics") or {}
        changes = result.get("changes") or {}
        answer = (
            f"{result.get('disclaimer')} "
            f"ER pressure {metrics.get('er_pressure')} "
            f"(Δ {changes.get('er_pressure')}). "
            f"ICU occupancy {metrics.get('icu_occupancy_percent')}% "
            f"(Δ {changes.get('icu_occupancy_percent')}). "
            f"Available ER+ICU beds {metrics.get('available_beds')} "
            f"(Δ {changes.get('available_beds')})."
        )

    return SimulateOut(
        disclaimer=result["disclaimer"],
            label=("ai_recommendation" if payload.action_id else "manual_what_if"),
        scenario=result["scenario"],
        baseline=result["baseline"],
        scenario_metrics=result["scenario_metrics"],
        changes=result["changes"],
        bottlenecks=result.get("bottlenecks") or [],
        warnings=result.get("warnings") or [],
        pressure=result.get("pressure"),
        answer=answer,
    )
