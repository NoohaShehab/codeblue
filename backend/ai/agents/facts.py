from ai.graph.state import HospitalState
from ai.tools.facts import load_hospital_snapshot


def facts_node(state: HospitalState) -> dict:
    try:
        snapshot = load_hospital_snapshot()
        return {"hospital_snapshot": snapshot, "errors": []}
    except Exception as exc:
        return {
            "hospital_snapshot": {},
            "errors": [f"Could not load hospital.db snapshot: {exc}"],
        }
