from typing import Any, Dict, List, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import SessionLocal
from models import (
    Bed,
    BedAssignment,
    ClinicalNote,
    Department,
    Equipment,
    HospitalEvent,
    PatientVisit,
    Staff,
    Transfer,
    Triage,
)

ACTIVE_VISIT_STATUSES = ("IN_PROGRESS", "ACTIVE", "WAITING", "IN_ER", "ADMITTED")
OCCUPIED_BED = "OCCUPIED"
AVAILABLE_BED = "AVAILABLE"
MAINTENANCE_BED = "MAINTENANCE"


def _session() -> Session:
    return SessionLocal()


def hospital_now(db: Session):
    """Synthetic data is not wall-clock 'today'. Use latest event/visit time."""
    event_max = db.query(func.max(HospitalEvent.event_time)).scalar()
    visit_max = db.query(func.max(PatientVisit.arrival_time)).scalar()
    values = [v for v in (event_max, visit_max) if v is not None]
    return max(values) if values else None


def _hours_ago(now, hours: int):
    if now is None:
        return None
    from datetime import timedelta

    return now - timedelta(hours=hours)


def resolve_department(db: Session, department: Optional[str]) -> Optional[Department]:
    if not department:
        return None
    raw = department.strip()
    if raw.upper() in {"ER", "ED"}:
        raw = "Emergency Room"
    if raw.upper() == "ICU":
        raw = "Intensive Care Unit"
    return (
        db.query(Department)
        .filter(
            or_(
                Department.name.ilike(raw),
                Department.type.ilike(department.strip()),
                Department.name.ilike(f"%{department.strip()}%"),
            )
        )
        .first()
    )


def _occupancy(occupied: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round(occupied / total * 100.0, 1)


def _pressure(occupancy_pct: float, waiting: int, available: int) -> float:
    score = occupancy_pct + min(waiting, 20) * 1.2 + (8 if available <= 1 else 0)
    return round(min(99.0, max(0.0, score)), 1)


def get_department_status(department: Optional[str] = None) -> Dict[str, Any]:
    db = _session()
    try:
        now = hospital_now(db)
        depts = db.query(Department).all()
        if department:
            match = resolve_department(db, department)
            depts = [match] if match else []
        rows = []
        for dept in depts:
            beds = db.query(Bed).filter(Bed.department_id == dept.department_id).all()
            total = len(beds)
            occupied = sum(1 for b in beds if (b.status or "").upper() == OCCUPIED_BED)
            available = sum(1 for b in beds if (b.status or "").upper() == AVAILABLE_BED)
            maintenance = sum(1 for b in beds if (b.status or "").upper() == MAINTENANCE_BED)
            occ = _occupancy(occupied, total)
            rows.append(
                {
                    "department_id": dept.department_id,
                    "name": dept.name,
                    "type": dept.type,
                    "location": dept.location,
                    "listed_capacity": dept.capacity,
                    "total_beds": total,
                    "occupied_beds": occupied,
                    "available_beds": available,
                    "maintenance_beds": maintenance,
                    "occupancy_percent": occ,
                    "signal": "critical" if occ >= 90 or available <= 1 else "watch" if occ >= 80 else "stable",
                }
            )
        return {"as_of": str(now) if now else None, "departments": rows}
    finally:
        db.close()


def get_department_capacity(department: Optional[str] = None) -> Dict[str, Any]:
    return get_department_status(department)


def get_bed_availability(department: Optional[str] = None) -> Dict[str, Any]:
    db = _session()
    try:
        query = db.query(Bed)
        dept = resolve_department(db, department) if department else None
        if dept:
            query = query.filter(Bed.department_id == dept.department_id)
        beds = query.all()
        by_status: Dict[str, int] = {}
        for bed in beds:
            key = (bed.status or "UNKNOWN").upper()
            by_status[key] = by_status.get(key, 0) + 1
        return {
            "department": dept.name if dept else "ALL",
            "total": len(beds),
            "by_status": by_status,
            "available": by_status.get(AVAILABLE_BED, 0),
            "occupied": by_status.get(OCCUPIED_BED, 0),
            "maintenance": by_status.get(MAINTENANCE_BED, 0),
        }
    finally:
        db.close()


def get_bed_occupancy(department: Optional[str] = None) -> Dict[str, Any]:
    availability = get_bed_availability(department)
    total = availability["total"]
    occupied = availability["occupied"]
    return {
        **availability,
        "occupancy_percent": _occupancy(occupied, total),
        "active_assignments": _active_assignment_count(department),
    }


def _active_assignment_count(department: Optional[str] = None) -> int:
    db = _session()
    try:
        query = db.query(BedAssignment).filter(BedAssignment.status.ilike("ACTIVE"))
        dept = resolve_department(db, department) if department else None
        if dept:
            query = query.join(Bed, Bed.bed_id == BedAssignment.bed_id).filter(Bed.department_id == dept.department_id)
        return query.count()
    finally:
        db.close()


def get_staff_status(department: Optional[str] = None) -> Dict[str, Any]:
    db = _session()
    try:
        query = db.query(Staff)
        dept = resolve_department(db, department) if department else None
        if dept:
            query = query.filter(Staff.department_id == dept.department_id)
        staff = query.all()
        by_status: Dict[str, int] = {}
        by_role: Dict[str, int] = {}
        available_nurses = 0
        for person in staff:
            st = (person.status or "UNKNOWN").upper()
            role = (person.role or "UNKNOWN").upper()
            by_status[st] = by_status.get(st, 0) + 1
            by_role[role] = by_role.get(role, 0) + 1
            if role == "NURSE" and st == "AVAILABLE":
                available_nurses += 1
        return {
            "department": dept.name if dept else "ALL",
            "total": len(staff),
            "by_status": by_status,
            "by_role": by_role,
            "available": by_status.get("AVAILABLE", 0),
            "busy": by_status.get("BUSY", 0),
            "off_duty": by_status.get("OFF_DUTY", 0),
            "available_nurses": available_nurses,
        }
    finally:
        db.close()


def get_equipment_status(department: Optional[str] = None) -> Dict[str, Any]:
    db = _session()
    try:
        query = db.query(Equipment)
        dept = resolve_department(db, department) if department else None
        if dept:
            query = query.filter(Equipment.department_id == dept.department_id)
        items = query.all()
        by_status: Dict[str, int] = {}
        by_type: Dict[str, Dict[str, int]] = {}
        for item in items:
            st = (item.status or "UNKNOWN").upper()
            typ = item.equipment_type or "UNKNOWN"
            by_status[st] = by_status.get(st, 0) + 1
            by_type.setdefault(typ, {})
            by_type[typ][st] = by_type[typ].get(st, 0) + 1
        return {
            "department": dept.name if dept else "ALL",
            "total": len(items),
            "by_status": by_status,
            "by_type": by_type,
            "available": by_status.get("AVAILABLE", 0),
            "in_use": by_status.get("IN_USE", 0),
            "maintenance": by_status.get("MAINTENANCE", 0),
        }
    finally:
        db.close()


def get_patient_flow(department: Optional[str] = None, hours: int = 24) -> Dict[str, Any]:
    db = _session()
    try:
        now = hospital_now(db)
        start = _hours_ago(now, hours)
        dept = resolve_department(db, department) if department else None
        arrivals = db.query(PatientVisit)
        discharges = db.query(PatientVisit)
        if dept:
            arrivals = arrivals.filter(PatientVisit.department_id == dept.department_id)
            discharges = discharges.filter(PatientVisit.department_id == dept.department_id)
        if start:
            arrivals = arrivals.filter(PatientVisit.arrival_time >= start)
            discharges = discharges.filter(PatientVisit.discharge_time >= start)
        arrival_count = arrivals.count()
        discharge_count = discharges.filter(PatientVisit.discharge_time.isnot(None)).count()
        transferred = 0
        if start:
            transferred_q = db.query(Transfer).filter(Transfer.transfer_time >= start)
            if dept:
                transferred_q = transferred_q.filter(
                    or_(Transfer.from_department_id == dept.department_id, Transfer.to_department_id == dept.department_id)
                )
            transferred = transferred_q.filter(Transfer.status.ilike("COMPLETED")).count()
        return {
            "department": dept.name if dept else "ALL",
            "window_hours": hours,
            "as_of": str(now) if now else None,
            "arrivals": arrival_count,
            "discharges": discharge_count,
            "completed_transfers": transferred,
            "net_flow": arrival_count - discharge_count,
        }
    finally:
        db.close()


def get_waiting_patients(department: Optional[str] = None, hours: int = 24) -> Dict[str, Any]:
    """WAITING transfers are the operational wait queue in this dataset (no ACTIVE visits)."""
    db = _session()
    try:
        now = hospital_now(db)
        start = _hours_ago(now, hours)
        dept = resolve_department(db, department) if department else None
        query = db.query(Transfer).filter(Transfer.status.ilike("WAITING"))
        if dept:
            query = query.filter(Transfer.from_department_id == dept.department_id)
        total_waiting = query.count()
        recent = query
        if start:
            recent = recent.filter(Transfer.request_time >= start)
        recent_count = recent.count()
        return {
            "department": dept.name if dept else "ALL",
            "waiting_transfers_total": total_waiting,
            "waiting_transfers_recent": recent_count,
            "recent_hours": hours,
            "note": "Visit table has no in-progress statuses; waiting is measured from WAITING transfers.",
        }
    finally:
        db.close()


def get_recent_events(limit: int = 15) -> Dict[str, Any]:
    db = _session()
    try:
        rows = (
            db.query(HospitalEvent)
            .order_by(HospitalEvent.event_time.desc())
            .limit(limit)
            .all()
        )
        by_type: Dict[str, int] = {}
        items = []
        for event in rows:
            et = event.event_type or "UNKNOWN"
            by_type[et] = by_type.get(et, 0) + 1
            items.append({"event_type": et, "event_time": str(event.event_time)})
        return {"count": len(items), "by_type": by_type, "events": items}
    finally:
        db.close()


def get_transfer_activity(department: Optional[str] = None, hours: int = 24) -> Dict[str, Any]:
    db = _session()
    try:
        now = hospital_now(db)
        start = _hours_ago(now, hours)
        query = db.query(Transfer)
        dept = resolve_department(db, department) if department else None
        if dept:
            query = query.filter(
                or_(Transfer.from_department_id == dept.department_id, Transfer.to_department_id == dept.department_id)
            )
        by_status: Dict[str, int] = {}
        for status, count in db.query(Transfer.status, func.count(Transfer.transfer_id)).group_by(Transfer.status).all():
            by_status[(status or "UNKNOWN").upper()] = count
        recent = query
        if start:
            recent = recent.filter(Transfer.request_time >= start)
        recent_waiting = recent.filter(Transfer.status.ilike("WAITING")).count()
        recent_completed = recent.filter(Transfer.status.ilike("COMPLETED")).count()
        return {
            "department": dept.name if dept else "ALL",
            "by_status_all_time": by_status,
            "recent_hours": hours,
            "recent_waiting": recent_waiting,
            "recent_completed": recent_completed,
        }
    finally:
        db.close()


def get_triage_summary(department: Optional[str] = None, hours: int = 24) -> Dict[str, Any]:
    db = _session()
    try:
        now = hospital_now(db)
        start = _hours_ago(now, hours)
        query = db.query(Triage).join(PatientVisit, Triage.visit_id == PatientVisit.visit_id)
        dept = resolve_department(db, department) if department else None
        if dept:
            query = query.filter(PatientVisit.department_id == dept.department_id)
        if start:
            query = query.filter(Triage.timestamp >= start)
        by_priority: Dict[str, int] = {}
        by_level: Dict[str, int] = {}
        complaints: Dict[str, int] = {}
        for row in query.limit(5000).all():
            pr = (row.priority or "UNKNOWN").upper()
            by_priority[pr] = by_priority.get(pr, 0) + 1
            lvl = str(row.severity_level)
            by_level[lvl] = by_level.get(lvl, 0) + 1
            complaint = (row.chief_complaint or "unspecified").strip()
            complaints[complaint] = complaints.get(complaint, 0) + 1
        top_complaints = sorted(complaints.items(), key=lambda x: x[1], reverse=True)[:8]
        return {
            "department": dept.name if dept else "ALL",
            "window_hours": hours,
            "count": sum(by_priority.values()),
            "by_priority": by_priority,
            "by_severity_level": by_level,
            "top_chief_complaints": [{"complaint": k, "count": v} for k, v in top_complaints],
        }
    finally:
        db.close()


def get_clinical_summary(department: Optional[str] = None, hours: int = 24) -> Dict[str, Any]:
    """Aggregates only. Does not return note text or patient identifiers."""
    db = _session()
    try:
        now = hospital_now(db)
        start = _hours_ago(now, hours)
        query = db.query(ClinicalNote)
        dept = resolve_department(db, department) if department else None
        if dept:
            query = query.filter(ClinicalNote.department_id == dept.department_id)
        if start:
            query = query.filter(ClinicalNote.timestamp >= start)
        by_type: Dict[str, int] = {}
        for note_type, count in (
            query.with_entities(ClinicalNote.note_type, func.count(ClinicalNote.note_id))
            .group_by(ClinicalNote.note_type)
            .all()
        ):
            by_type[note_type or "UNKNOWN"] = count
        visit_q = db.query(PatientVisit)
        if dept:
            visit_q = visit_q.filter(PatientVisit.department_id == dept.department_id)
        if start:
            visit_q = visit_q.filter(PatientVisit.arrival_time >= start)
        by_severity: Dict[str, int] = {}
        for sev, count in visit_q.with_entities(PatientVisit.severity, func.count(PatientVisit.visit_id)).group_by(PatientVisit.severity).all():
            by_severity[sev or "UNKNOWN"] = count
        return {
            "department": dept.name if dept else "ALL",
            "window_hours": hours,
            "notes_by_type": by_type,
            "visit_severity_mix": by_severity,
            "disclaimer": "Operational clinical context only. Not a diagnosis.",
        }
    finally:
        db.close()


def get_hospital_snapshot(department: Optional[str] = None) -> Dict[str, Any]:
    status = get_department_status()
    er = next((d for d in status["departments"] if (d.get("type") or "").upper() == "ER"), None)
    icu = next((d for d in status["departments"] if (d.get("type") or "").upper() == "ICU"), None)
    focus = department or ("ER" if department is None else department)
    snapshot = {
        "as_of": status.get("as_of"),
        "source": "hospital.db",
        "departments": status["departments"],
        "er": er,
        "icu": icu,
        "beds": get_bed_occupancy(department),
        "staff": get_staff_status(department),
        "equipment": get_equipment_status(department),
        "flow_24h": get_patient_flow(department, 24),
        "waiting": get_waiting_patients(department, 24),
        "transfers": get_transfer_activity(department, 24),
        "triage_24h": get_triage_summary(department or "ER", 24),
        "clinical_24h": get_clinical_summary(department, 24),
        "focus_department": normalize_focus(department),
    }
    if er and icu:
        snapshot["hospital_occupancy_percent"] = _occupancy(
            (er["occupied_beds"] + icu["occupied_beds"]),
            (er["total_beds"] + icu["total_beds"]),
        )
        snapshot["available_beds_total"] = er["available_beds"] + icu["available_beds"]
        snapshot["er_pressure"] = _pressure(er["occupancy_percent"], snapshot["waiting"].get("waiting_transfers_recent", 0), er["available_beds"])
        snapshot["icu_occupancy_percent"] = icu["occupancy_percent"]
    return snapshot


def normalize_focus(department: Optional[str]) -> Optional[str]:
    if not department:
        return None
    raw = department.strip().lower()
    if raw in {"er", "emergency", "emergency room"}:
        return "ER"
    if raw in {"icu", "intensive care unit", "intensive care"}:
        return "ICU"
    return department
