import json
import os
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from ai.graph.state import HospitalState
from ai.schemas.recommendation import Recommendation, RecommendationItem
from ai.prompts.prompts import RECOMMENDATION_SUMMARY_PROMPT


ACTION_LIBRARY = {
    "increase_physician_capacity": {
        "action": "Increase physician coverage for ER assessment",
        "owner": "ER Operations and Medical Staffing",
    },
    "increase_triage_capacity": {
        "action": "Increase nurse coverage for ER triage",
        "owner": "ER Charge Nurse and Operations",
    },
    "coordinate_er_assessment_flow": {
        "action": "Coordinate ER assessment flow and reassess physician coverage",
        "owner": "ER Operations",
    },

    "reduce_er_boarding": {
        "action": "Reduce ER boarding through bed-placement escalation",
        "owner": "Bed Placement and Operations",
    },

    "protect_icu_capacity": {
        "action": "Protect ICU capacity and confirm step-down placement",
        "owner": "ICU Charge and Bed Placement",
    },

    "activate_flex_capacity": {
        "action": "Activate approved flex capacity",
        "owner": "Capacity Command Group",
    },

    "coordinated_discharge_huddle": {
        "action": "Run a coordinated discharge huddle",
        "owner": "Medicine, Pharmacy, and Case Management",
    },
    "monitor_operational_bottleneck": {
        "action": "Monitor the detected bottleneck and reassess operational capacity",
        "owner": "ER Operations",
    },
}


def _snapshot_signals(snapshot: Dict[str, Any]) -> List[str]:
    signals: List[str] = []

    er = snapshot.get("er") or {}
    icu = snapshot.get("icu") or {}
    waiting = snapshot.get("waiting") or {}

    if er.get("occupancy_percent") is not None:
        signals.append(
            f"ER occupancy: {er['occupancy_percent']}%"
        )

    if icu.get("occupancy_percent") is not None:
        signals.append(
            f"ICU occupancy: {icu['occupancy_percent']}%"
        )

    if icu.get("available_beds") is not None:
        signals.append(
            f"ICU available beds: {icu['available_beds']}"
        )

    if er.get("available_beds") is not None:
        signals.append(
            f"ER available beds: {er['available_beds']}"
        )

    if waiting.get("waiting_transfers_recent") is not None:
        signals.append(
            f"Recent waiting transfers: "
            f"{waiting['waiting_transfers_recent']}"
        )

    return signals


def _choose_actions(
    snapshot: Dict[str, Any],
    analyses: Dict[str, Any],
    simulation: Dict[str, Any],
    user_query: str,
) -> List[RecommendationItem]:
    er = snapshot.get("er") or {}
    icu = snapshot.get("icu") or {}
    waiting = snapshot.get("waiting") or {}

    actions: List[RecommendationItem] = []
    signals = _snapshot_signals(snapshot)

    simulation_warnings = simulation.get("warnings") or []

    # -------------------------
    # ER / Transfer pressure
    # -------------------------

    if (
        (waiting.get("waiting_transfers_recent") or 0) >= 10
        or simulation_warnings
    ):
        actions.append(
            RecommendationItem(
                action_id="reduce_er_boarding",
                action=ACTION_LIBRARY["reduce_er_boarding"]["action"],
                priority="high",
                reason=(
                    "The verified snapshot shows elevated transfer pressure."
                ),
                signals=signals,
                expected_impact=(
                    "Improve transfer flow and reduce ER boarding pressure."
                ),
                owner=ACTION_LIBRARY["reduce_er_boarding"]["owner"],
                status="recommended",
            )
        )

    # -------------------------
    # ICU pressure
    # -------------------------

    if (
        (icu.get("occupancy_percent") or 0) >= 90
        or (icu.get("available_beds") or 0) <= 1
    ):
        actions.append(
            RecommendationItem(
                action_id="protect_icu_capacity",
                action=ACTION_LIBRARY["protect_icu_capacity"]["action"],
                priority="critical",
                reason=(
                    "The verified snapshot shows a very small ICU "
                    "operating buffer."
                ),
                signals=signals,
                expected_impact=(
                    "Preserve the remaining ICU buffer for incoming demand."
                ),
                owner=ACTION_LIBRARY["protect_icu_capacity"]["owner"],
                status="recommended",
            )
        )

    # -------------------------
    # ER capacity
    # -------------------------

    if (
        (er.get("occupancy_percent") or 0) >= 90
        or (er.get("available_beds") or 0) <= 1
    ):
        actions.append(
            RecommendationItem(
                action_id="activate_flex_capacity",
                action=ACTION_LIBRARY["activate_flex_capacity"]["action"],
                priority="high",
                reason=(
                    "The verified snapshot shows ER capacity at or near "
                    "its operating limit."
                ),
                signals=signals,
                expected_impact=(
                    "Create controlled capacity for near-term "
                    "operational pressure."
                ),
                owner=ACTION_LIBRARY["activate_flex_capacity"]["owner"],
                status="requires_approval",
            )
        )

    # -------------------------
    # No critical signal
    # -------------------------

    if not actions:
        actions.append(
            RecommendationItem(
                action_id="coordinated_discharge_huddle",
                action=ACTION_LIBRARY[
                    "coordinated_discharge_huddle"
                ]["action"],
                priority="medium",
                reason=(
                    "No critical capacity signal was detected. "
                    "A coordinated discharge review can maintain "
                    "bed turnover."
                ),
                signals=signals,
                expected_impact=(
                    "Maintain bed turnover and identify emerging "
                    "capacity constraints early."
                ),
                owner=ACTION_LIBRARY[
                    "coordinated_discharge_huddle"
                ]["owner"],
                status="monitor",
            )
        )

    return actions


def _choose_context_actions(context: Dict[str, Any]) -> List[RecommendationItem]:
    bottlenecks = context.get("bottlenecks") or {}
    items = bottlenecks.get("bottlenecks") or []
    if not items:
        return []
    bottleneck = items[0]
    bottleneck_type = bottleneck.get("bottleneck_type")
    cause_type = bottleneck.get("cause_type") or "QUEUE_ACCUMULATION"
    evidence = bottleneck.get("cause_evidence") or []
    signals = list(evidence)
    metrics = context.get("metrics") or {}
    forecast = context.get("forecast") or {}
    if metrics.get("longest_wait_minutes") is not None:
        signals.append(f"Longest ER wait: {metrics['longest_wait_minutes']} minutes")
    if forecast.get("peak_arrivals") is not None:
        signals.append(f"Forecast peak arrivals: {forecast['peak_arrivals']}")

    action_by_type = {
        "ICU_CAPACITY": "protect_icu_capacity",
        "TRANSFER_CAPACITY": "reduce_er_boarding",
        "DISPOSITION": "coordinated_discharge_huddle",
        "TRIAGE_CAPACITY": "increase_triage_capacity",
    }
    if bottleneck_type == "PHYSICIAN_ASSESSMENT":
        action_id = "increase_physician_capacity" if cause_type == "PHYSICIAN_CAPACITY" else "coordinate_er_assessment_flow"
    elif bottleneck_type == "TRIAGE_CAPACITY" and cause_type != "TRIAGE_CAPACITY":
        action_id = "monitor_operational_bottleneck"
    else:
        action_id = action_by_type.get(bottleneck_type)
    if not action_id:
        action_id = "reduce_er_boarding" if cause_type == "QUEUE_ACCUMULATION" else None
    if not action_id or action_id not in ACTION_LIBRARY:
        action_id = "monitor_operational_bottleneck"

    priority = "critical" if bottleneck.get("severity") == "HIGH" else "high"
    action = ACTION_LIBRARY[action_id]
    return [RecommendationItem(
        action_id=action_id,
        action=action["action"],
        priority=priority,
        reason=(
            f"The detected {bottleneck_type} bottleneck is supported by verified "
            f"operational evidence and its contributing factor is {cause_type}."
        ),
        signals=signals,
        expected_impact=(
            "Reduce the affected operational queue and prevent further accumulation "
            "under the current forecast context."
            if action_id != "monitor_operational_bottleneck"
            else "Maintain visibility until verified evidence supports a targeted intervention."
        ),
        owner=action["owner"],
        status="requires_approval" if action_id in {"increase_physician_capacity", "activate_flex_capacity"} else "recommended",
    )]


def _generate_summary(
    state: HospitalState,
    actions: List[RecommendationItem],
) -> str:

    if not os.getenv("OPENAI_API_KEY"):
        return _fallback_summary(actions)

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.getenv("OPENAI_API_KEY"),
    )

    snapshot = state.get("hospital_snapshot") or {}

    payload = {
        "hospital_facts": snapshot,
        "structured_recommendation_context": state.get("recommendation_context") or {},
        "allowed_actions": [
            item.model_dump()
            for item in actions
        ],
        "user_query": state.get("user_query", ""),
    }

    message = llm.invoke(
        [
            SystemMessage(
                content=RECOMMENDATION_SUMMARY_PROMPT
            ),
            HumanMessage(
                content=json.dumps(
                    payload,
                    default=str
                )
            ),
        ]
    )

    content = message.content

    if isinstance(content, str) and content.strip():
        return content.strip()

    return _fallback_summary(actions)


def _fallback_summary(
    actions: List[RecommendationItem],
) -> str:

    critical = [
        item for item in actions
        if item.priority == "critical"
    ]

    if critical:
        return (
            f"{critical[0].action}. "
            f"This is the highest-priority operational action "
            f"based on the current verified hospital signals."
        )

    return (
        f"{actions[0].action}. "
        f"Monitor the current operational signals and reassess capacity."
    )


def recommendation_node(state: HospitalState) -> dict:

    snapshot = state.get("hospital_snapshot") or {}

    analyses = {
        "operations_analysis": state.get(
            "operations_analysis"
        ),
        "resource_analysis": state.get(
            "resource_analysis"
        ),
    }

    simulation = state.get(
        "simulation_result"
    ) or {}

    # 1. Determine allowed actions from verified data
    structured_context = state.get("recommendation_context") or {}
    actions = _choose_context_actions(structured_context) if structured_context else []
    if not actions:
        actions = _choose_actions(
            snapshot,
            analyses,
            simulation,
            state.get("user_query", ""),
        )

    # 2. Generate human-readable summary
    summary = _generate_summary(
        state,
        actions,
    )

    # 3. Determine focus areas
    focus_areas = []

    for item in actions:

        if item.action_id == "protect_icu_capacity":
            focus_areas.append("ICU")

        elif item.action_id in {"increase_physician_capacity", "increase_triage_capacity"}:
            focus_areas.append("ER")

        elif item.action_id == "reduce_er_boarding":
            focus_areas.append("ER")

        elif item.action_id == "activate_flex_capacity":
            focus_areas.append("ER")

        elif item.action_id == "coordinated_discharge_huddle":
            focus_areas.append("Inpatient capacity")

        elif item.action_id == "reduce_er_boarding":
            focus_areas.append("ER transfer flow")

    focus_areas = list(dict.fromkeys(focus_areas))

    # 4. Highest priority
    priority_order = (
        "low",
        "medium",
        "high",
        "critical",
    )

    actions = sorted(
        actions,
        key=lambda item: priority_order.index(item.priority),
        reverse=True,
    )
    primary_action = actions[0]
    highest_priority = primary_action.priority

    recommendation = Recommendation(
        action_id=primary_action.action_id,
        summary=summary,
        focus_areas=focus_areas,
        recommendations=actions,
        priority=highest_priority,
        department="ER and ICU" if len(focus_areas) > 1 else (focus_areas[0] if focus_areas else None),
        action=primary_action.action,
        reason=primary_action.reason,
        signals=primary_action.signals,
        expected_impact=primary_action.expected_impact,
        owner=primary_action.owner,
        status=primary_action.status,
    )

    decision = recommendation.model_dump()
    specialist_response = state.get("final_response") or {}

    return {
        "decision": decision,

        "final_response": {
            "routed_to": specialist_response.get("routed_to", "recommendation"),
            "agent": specialist_response.get("agent", "Recommendation Agent"),
            "answer": specialist_response.get("answer", summary),
            "recommendation_agent": "Recommendation Agent",
            "recommendation_summary": summary,
            "recommendation": decision,
        },

        "requires_human_approval": any(
            item.status == "requires_approval"
            for item in actions
        ),
    }