import json
import os
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from ai.graph.state import HospitalState
from ai.prompts.prompts import SIMULATION_PROMPT
from ai.schemas.scenario import ScenarioInput, scenario_from_sliders
from ai.simulation.simulation_engine import run_simulation
from ai.tools.facts import compact_operational_facts


def scenario_from_query(query: str) -> ScenarioInput:
    """Extract slider-style levers from a what-if question. Unmentioned levers stay 0."""
    q = (query or "").lower()
    er_pct = 0.0
    icu_beds = 0
    icu_admits = 0
    delayed = 0

    arrival_match = re.search(
        r"(\+?-?\d+(?:\.\d+)?)\s*%?.{0,24}(arrival|er demand|er volume)",
        q,
    )
    if not arrival_match:
        arrival_match = re.search(r"(arrival|er).{0,24}(\+?-?\d+(?:\.\d+)?)\s*%", q)
        if arrival_match:
            er_pct = float(arrival_match.group(2))
    else:
        er_pct = float(arrival_match.group(1))

    beds_match = re.search(r"(\d+)\s+(icu\s+)?beds?\s+(unavailable|offline|closed|down)", q)
    if beds_match:
        icu_beds = int(beds_match.group(1))
    else:
        beds_match = re.search(r"(unavailable|offline|lose|lost).{0,20}(\d+)\s+(icu\s+)?beds?", q)
        if beds_match:
            icu_beds = int(beds_match.group(2))

    admit_match = re.search(r"(\d+)\s+(additional|extra|more)\s+(icu\s+)?admission", q)
    if admit_match:
        icu_admits = int(admit_match.group(1))

    delay_match = re.search(r"(\d+)\s+delayed\s+discharge", q)
    if delay_match:
        delayed = int(delay_match.group(1))

    if er_pct == 0 and any(w in q for w in ("surge", "mass casualty", "mass-casualty", "mci")):
        er_pct = 20.0

    return scenario_from_sliders(er_pct, icu_beds, icu_admits, delayed)


def interpret_simulation(result: dict, snapshot: dict) -> str | None:
    if not os.getenv("OPENAI_API_KEY"):
        return None
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.getenv("OPENAI_API_KEY"),
    )
    payload = {
        "baseline_facts": compact_operational_facts(snapshot),
        "simulation": {
            "disclaimer": result.get("disclaimer"),
            "scenario": result.get("scenario"),
            "baseline": result.get("baseline"),
            "scenario_metrics": result.get("scenario_metrics"),
            "changes": result.get("changes"),
            "bottlenecks": result.get("bottlenecks"),
            "warnings": result.get("warnings"),
        },
    }
    message = llm.invoke(
        [
            SystemMessage(content=SIMULATION_PROMPT),
            HumanMessage(content=json.dumps(payload, default=str)),
        ]
    )
    content = message.content
    return content if isinstance(content, str) else str(content)


def simulation_node(state: HospitalState) -> dict:
    snapshot = state.get("hospital_snapshot") or {}
    query = state.get("user_query", "")
    scenario = state.get("scenario")
    if isinstance(scenario, dict) and scenario:
        parsed = ScenarioInput.model_validate(scenario)
    else:
        parsed = scenario_from_query(query)
    result = run_simulation(snapshot, parsed)
    answer = interpret_simulation(result, snapshot)
    if not answer:
        answer = _fallback_brief(result)
    return {
        "simulation_result": result,
        "scenario": parsed.model_dump(),
        "final_response": {
            "routed_to": "simulate",
            "agent": "Simulation Agent",
            "answer": answer,
            "simulation": result,
        },
    }


def _fallback_brief(result: dict) -> str:
    metrics = result.get("scenario_metrics") or {}
    changes = result.get("changes") or {}
    warnings = result.get("warnings") or []
    lines = [
        result.get("disclaimer") or "",
        (
            f"Scenario ER pressure is {metrics.get('er_pressure')} "
            f"(change {changes.get('er_pressure')}), ICU occupancy "
            f"{metrics.get('icu_occupancy_percent')}% "
            f"(change {changes.get('icu_occupancy_percent')}), "
            f"available ER+ICU beds {metrics.get('available_beds')} "
            f"(change {changes.get('available_beds')})."
        ),
    ]
    if warnings:
        lines.append("Warnings: " + " ".join(warnings))
    return " ".join(line for line in lines if line)
