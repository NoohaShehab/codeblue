import json
from typing import Any, Dict, List


def _dept_brief(dept: Dict[str, Any] | None) -> Dict[str, Any]:
    dept = dept or {}
    return {
        "name": dept.get("name"),
        "type": dept.get("type"),
        "occupancy_percent": dept.get("occupancy_percent"),
        "total_beds": dept.get("total_beds"),
        "occupied_beds": dept.get("occupied_beds"),
        "available_beds": dept.get("available_beds"),
        "maintenance_beds": dept.get("maintenance_beds"),
        "signal": dept.get("signal"),
    }


def compact_operational_facts(snapshot: Dict[str, Any] | None) -> Dict[str, Any]:
    """Small, citation-safe payload for LLM prompts. No invented fields."""
    snapshot = snapshot or {}
    departments: List[Dict[str, Any]] = [
        _dept_brief(d) for d in (snapshot.get("departments") or [])
    ]
    waiting = snapshot.get("waiting") or {}
    flow = snapshot.get("flow_24h") or {}
    staff = snapshot.get("staff") or {}
    equipment = snapshot.get("equipment") or {}
    triage = snapshot.get("triage_24h") or {}
    return {
        "as_of": snapshot.get("as_of"),
        "source": snapshot.get("source") or "hospital.db",
        "er": {**_dept_brief(snapshot.get("er")), "pressure": snapshot.get("er_pressure")},
        "icu": {
            **_dept_brief(snapshot.get("icu")),
            "occupancy_percent": snapshot.get("icu_occupancy_percent")
            or (snapshot.get("icu") or {}).get("occupancy_percent"),
        },
        "departments": departments,
        "available_beds_er_icu": snapshot.get("available_beds_total"),
        "flow_24h": {
            "arrivals": flow.get("arrivals"),
            "discharges": flow.get("discharges"),
            "completed_transfers": flow.get("completed_transfers"),
            "net_flow": flow.get("net_flow"),
        },
        "waiting_transfers_recent": waiting.get("waiting_transfers_recent"),
        "waiting_transfers_total": waiting.get("waiting_transfers_total"),
        "staff": {
            "total": staff.get("total"),
            "available": staff.get("available"),
            "busy": staff.get("busy"),
            "available_nurses": staff.get("available_nurses"),
            "by_role": staff.get("by_role"),
        },
        "equipment": {
            "total": equipment.get("total"),
            "available": equipment.get("available"),
            "in_use": equipment.get("in_use"),
            "maintenance": equipment.get("maintenance"),
        },
        "triage_24h_count": triage.get("count"),
        "triage_by_priority": triage.get("by_priority"),
    }


def facts_json(snapshot: Dict[str, Any] | None) -> str:
    return json.dumps(compact_operational_facts(snapshot), default=str)


def load_hospital_snapshot() -> Dict[str, Any]:
    from ai.tools.hospital_tools import get_hospital_snapshot

    return get_hospital_snapshot()
