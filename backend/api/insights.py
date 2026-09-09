from fastapi import APIRouter

from insights.schemas import InsightsResponse
from insights.service import get_insights


router = APIRouter(prefix="/api/insights", tags=["Insights"])


@router.get("", response_model=InsightsResponse)
def list_insights() -> InsightsResponse:
    return get_insights()
