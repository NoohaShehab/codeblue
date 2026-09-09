from typing import Any, Dict, List, Optional, TypedDict


class HospitalState(TypedDict, total=False):
    user_query: str
    recommendation_context: Optional[Dict[str, Any]]
    mode: str
    thread_id: str
    intent: Optional[str]
    department: Optional[str]
    entities: Dict[str, Any]
    nlp: Optional[Dict[str, Any]]
    hospital_snapshot: Dict[str, Any]
    forecast: Optional[Dict[str, Any]]
    scenario: Optional[Dict[str, Any]]
    routing_decision: Optional[Dict[str, Any]]
    operations_analysis: Optional[Dict[str, Any]]
    resource_analysis: Optional[Dict[str, Any]]
    clinical_analysis: Optional[Dict[str, Any]]
    simulation_result: Optional[Dict[str, Any]]
    decision: Optional[Dict[str, Any]]
    visualization: Optional[Dict[str, Any]]
    final_response: Optional[Dict[str, Any]]
    missing_information: List[str]
    requires_human_approval: bool
    errors: List[str]
    llm_used: bool
