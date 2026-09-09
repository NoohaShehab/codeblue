from typing import Dict, List

from ai.tools.hospital_tools import get_hospital_snapshot
from insights.rules import build_capacity_insights
from insights.schemas import Insight, InsightsResponse, InsightsSummary


_SEVERITY_ORDER = {"critical": 0, "watch": 1, "stable": 2}


def _rank_insights(insights: List[Insight]) -> List[Insight]:
    ranked = sorted(
        insights,
        key=lambda insight: (_SEVERITY_ORDER[insight.severity], insight.department),
    )
    return [insight.model_copy(update={"rank": index}) for index, insight in enumerate(ranked, start=1)]


def _summary(insights: List[Insight]) -> InsightsSummary:
    counts: Dict[str, int] = {"critical": 0, "watch": 0, "stable": 0}
    for insight in insights:
        counts[insight.severity] += 1
    return InsightsSummary(**counts)


def get_insights() -> InsightsResponse:
    snapshot = get_hospital_snapshot()
    insights = _rank_insights(build_capacity_insights(snapshot))
    return InsightsResponse(summary=_summary(insights), insights=insights)
