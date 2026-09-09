from typing import Any, Dict, List

from insights.schemas import EvidenceItem, Insight, Severity


SUPPORTED_DEPARTMENTS = {
    "ER": "Emergency",
    "ICU": "ICU",
}


def _severity(row: Dict[str, Any]) -> Severity:
    signal = row.get("signal")
    if signal in {"critical", "watch", "stable"}:
        return signal
    return "stable"


def _display_department(row: Dict[str, Any], department_type: str) -> str:
    if department_type == "ER":
        return "ER"
    if department_type == "ICU":
        return "ICU"
    return str(row.get("name") or department_type)


def build_capacity_insight(
    row: Dict[str, Any],
    department_type: str,
    source: str,
    as_of: Any,
) -> Insight:
    department = _display_department(row, department_type)
    severity = _severity(row)
    occupancy = row.get("occupancy_percent")
    available = row.get("available_beds")
    occupied = row.get("occupied_beds")
    total = row.get("total_beds")

    evidence = [
        EvidenceItem(label="Occupancy", value=occupancy, source=source),
        EvidenceItem(label="Available beds", value=available, source=source),
        EvidenceItem(label="Occupied beds", value=occupied, source=source),
        EvidenceItem(label="Total beds", value=total, source=source),
    ]
    description = (
        f"{department} occupancy is currently {occupancy}% with "
        f"{available} {'bed' if available == 1 else 'beds'} available."
    )

    return Insight(
        id=f"capacity-{department_type.lower()}",
        department=department,
        severity=severity,
        title=f"{department} capacity status",
        description=description,
        evidence=evidence,
        source=source,
        as_of=str(as_of) if as_of is not None else None,
        rank=0,
    )


def build_capacity_insights(snapshot: Dict[str, Any]) -> List[Insight]:
    source = str(snapshot.get("source") or "hospital.db")
    as_of = snapshot.get("as_of")
    insights: List[Insight] = []
    for department_type in ("ICU", "ER"):
        row = snapshot.get(department_type.lower())
        if isinstance(row, dict):
            insights.append(build_capacity_insight(row, department_type, source, as_of))
    return insights
