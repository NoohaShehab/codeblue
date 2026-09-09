import json
import os
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from ai.graph.state import HospitalState
from ai.schemas.recommendation import Recommendation, RecommendationItem
from ai.prompts.prompts import RECOMMENDATION_SUMMARY_PROMPT


ACTION_LIBRARY: Dict[str, Dict[str, str]] = {
    "coordinated_discharge_huddle": {
        "action": "Run a coordinated discharge huddle",
        "owner": "Medicine, Pharmacy, and Case Management",
    },
    "reduce_er_boarding": {
        "action": "Reduce ER boarding through bed-placement escalation",
        "owner": "Bed Placement and Operations",
    },
    "activate_flex_capacity": {
        "action": "Activate approved flex capacity",
        "owner": "Capacity Command Group",
    },
    "protect_icu_capacity": {
        "action": "Protect ICU capacity and confirm step-down placement",
        "owner": "ICU Charge and Bed Placement",
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

        elif item.action_id == "reduce_er_boarding":
            focus_areas.append("ER")

        elif item.action_id == "activate_flex_capacity":
            focus_areas.append("ER")

        elif item.action_id == "coordinated_discharge_huddle":
            focus_areas.append("Inpatient capacity")

    focus_areas = list(dict.fromkeys(focus_areas))

    # 4. Highest priority
    priority_order = (
        "low",
        "medium",
        "high",
        "critical",
    )

    highest_priority = max(
        actions,
        key=lambda item: priority_order.index(
            item.priority
        ),
    ).priority

    recommendation = Recommendation(
        summary=summary,
        focus_areas=focus_areas,
        recommendations=actions,
        priority=highest_priority,
        department="ER and ICU" if len(focus_areas) > 1 else (focus_areas[0] if focus_areas else None),
        action=actions[0].action,
        reason=actions[0].reason,
        signals=actions[0].signals,
        expected_impact=actions[0].expected_impact,
        owner=actions[0].owner,
        status=actions[0].status,
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