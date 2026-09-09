from collections import Counter
from datetime import datetime, timedelta
from statistics import mean
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from api.dependencies import get_db
from models import Bed, BedAssignment, Department, PatientVisit, Staff, Triage, Transfer

router = APIRouter(prefix="/api/er", tags=["ER Operations"])

ACTIVE_STATUSES = {
    "ARRIVED",
    "REGISTERED",
    "TRIAGED",
    "WAITING_FOR_ASSESSMENT",
    "IN_ASSESSMENT",
    "IN_TREATMENT",
    "WAITING_FOR_DISPOSITION",
    "WAITING_FOR_ICU",
    "OBSERVATION",
    "ADMITTED",
}
TERMINAL_STATUSES = {"DISCHARGED", "TRANSFERRED"}


class ERQueueItem(BaseModel):
    visit_id: int
    patient_id: int
    patient_label: str
    arrival_time: datetime
    current_status: str
    triage_level: Optional[int]
    triage_priority: Optional[str]
    waiting_minutes: int


class ERQueueResponse(BaseModel):
    as_of: Optional[datetime]
    patients: List[ERQueueItem]


class ERMetricsResponse(BaseModel):
    as_of: Optional[datetime]
    total_active_patients: int
    patients_waiting_for_assessment: int
    average_wait_minutes: int
    longest_wait_minutes: int
    longest_waiting_patient_id: Optional[int]
    patients_in_assessment: int
    patients_in_treatment: int
    patients_waiting_for_icu: int
    flow: Dict[str, int]


class ERBottleneck(BaseModel):
    bottleneck_type: str
    severity: str
    affected_patient_count: int
    average_wait_minutes: int
    explanation: str
    cause_type: Optional[str] = None
    cause_evidence: List[str] = Field(default_factory=list)


class ERBottleneckResponse(BaseModel):
    as_of: Optional[datetime]
    bottlenecks: List[ERBottleneck]


def _er_department_ids(db: Session) -> List[int]:
    departments = (
        db.query(Department)
        .filter(
            Department.type.ilike("%er%")
            | Department.name.ilike("%emergency%")
            | Department.name.ilike("%emergency room%")
        )
        .all()
    )
    return [department.department_id for department in departments]


def _operational_now(db: Session) -> Optional[datetime]:
    latest_visit = db.query(PatientVisit.arrival_time).order_by(PatientVisit.arrival_time.desc()).first()
    return latest_visit[0] if latest_visit else datetime.now()


def _active_visits(db: Session) -> List[PatientVisit]:
    department_ids = _er_department_ids(db)
    if not department_ids:
        return []
    visits = (
        db.query(PatientVisit)
        .filter(
            PatientVisit.department_id.in_(department_ids),
            PatientVisit.discharge_time.is_(None),
        )
        .order_by(PatientVisit.arrival_time.asc())
        .all()
    )
    return [
        visit
        for visit in visits
        if (visit.current_status or visit.status or "").upper() not in TERMINAL_STATUSES
    ]


def _triage_by_visit(db: Session, visit_ids: List[int]) -> Dict[int, Triage]:
    rows = (
        db.query(Triage)
        .filter(Triage.visit_id.in_(visit_ids))
        .order_by(Triage.timestamp.desc())
        .all()
    )
    latest: Dict[int, Triage] = {}
    for row in rows:
        latest.setdefault(row.visit_id, row)
    return latest


def _icu_department_ids(db: Session) -> List[int]:
    return [
        row.department_id
        for row in db.query(Department)
        .filter(
            Department.type.ilike("%icu%")
            | Department.name.ilike("%intensive%")
        )
        .all()
    ]


def _has_active_icu_assignment(db: Session, visit: PatientVisit) -> bool:
    icu_ids = _icu_department_ids(db)
    if not icu_ids:
        return False
    return (
        db.query(BedAssignment)
        .join(Bed, Bed.bed_id == BedAssignment.bed_id)
        .filter(
            Bed.department_id.in_(icu_ids),
            BedAssignment.patient_id == visit.patient_id,
            BedAssignment.status.ilike("active"),
            BedAssignment.end_time.is_(None),
        )
        .first()
        is not None
    )


def _derived_status(db: Session, visit: PatientVisit, triage: Optional[Triage]) -> str:
    explicit = (visit.current_status or "").strip().upper()
    if explicit in ACTIVE_STATUSES or explicit in TERMINAL_STATUSES:
        return explicit
    status = (visit.status or "").strip().upper()
    if status == "TRANSFERRED_TO_ICU":
        return "TRANSFERRED" if _has_active_icu_assignment(db, visit) else "WAITING_FOR_ICU"
    if visit.disposition and visit.disposition.upper() == "ICU":
        return "TRANSFERRED" if _has_active_icu_assignment(db, visit) else "WAITING_FOR_ICU"
    if visit.disposition_time:
        return "WAITING_FOR_DISPOSITION"
    if visit.treatment_start_time:
        return "IN_TREATMENT"
    if visit.assessment_start_time:
        return "IN_ASSESSMENT"
    if triage:
        return "WAITING_FOR_ASSESSMENT"
    if visit.registration_time:
        return "REGISTERED"
    return "ARRIVED"


def _stage_start(visit: PatientVisit, status: str, triage: Optional[Triage]) -> datetime:
    timestamps = {
        "REGISTERED": visit.registration_time or visit.arrival_time,
        "TRIAGED": triage.timestamp if triage else visit.arrival_time,
        "WAITING_FOR_ASSESSMENT": triage.timestamp if triage else visit.arrival_time,
        "IN_ASSESSMENT": visit.assessment_start_time or visit.arrival_time,
        "IN_TREATMENT": visit.treatment_start_time or visit.assessment_end_time or visit.arrival_time,
        "WAITING_FOR_DISPOSITION": visit.treatment_start_time or visit.assessment_end_time or visit.arrival_time,
        "WAITING_FOR_ICU": visit.disposition_time or visit.treatment_start_time or visit.arrival_time,
    }
    return timestamps.get(status, visit.arrival_time)


def _queue_items(db: Session) -> tuple[Optional[datetime], List[ERQueueItem]]:
    visits = _active_visits(db)
    now = _operational_now(db)
    if now is None:
        return None, []
    triage = _triage_by_visit(db, [visit.visit_id for visit in visits])
    items = []
    for visit in visits:
        row_triage = triage.get(visit.visit_id)
        status = _derived_status(db, visit, row_triage)
        start = _stage_start(visit, status, row_triage)
        waiting = max(0, round((now - start).total_seconds() / 60))
        items.append(
            ERQueueItem(
                visit_id=visit.visit_id,
                patient_id=visit.patient_id,
                patient_label=f"Patient {visit.patient_id}",
                arrival_time=visit.arrival_time,
                current_status=status,
                triage_level=row_triage.severity_level if row_triage else None,
                triage_priority=row_triage.priority if row_triage else None,
                waiting_minutes=waiting,
            )
        )
    return now, items


def _available_staff(db: Session, department_ids: List[int], roles: tuple[str, ...]) -> int:
    if not department_ids:
        return 0
    return db.query(Staff).filter(
        Staff.department_id.in_(department_ids),
        Staff.status.ilike("available"),
        or_(*(Staff.role.ilike(f"%{role}%") for role in roles)),
    ).count()


def _cause_for(
    bottleneck_type: str,
    affected: List[ERQueueItem],
    available_resources: Optional[int] = None,
    resource_label: Optional[str] = None,
) -> tuple[str, List[str]]:
    average_wait = round(mean([item.waiting_minutes for item in affected])) if affected else 0
    evidence = [
        f"{len(affected)} affected patients",
        f"{average_wait} minutes average operational wait",
    ]
    if available_resources is not None and resource_label:
        evidence.append(f"{available_resources} available {resource_label}")
        if available_resources == 0 or len(affected) > available_resources:
            cause_types = {
                "PHYSICIAN_ASSESSMENT": "PHYSICIAN_CAPACITY",
                "TRIAGE_CAPACITY": "TRIAGE_CAPACITY",
                "DISPOSITION": "DISPOSITION_CAPACITY",
            }
            return cause_types.get(bottleneck_type, "RESOURCE_CAPACITY"), evidence
    return "QUEUE_ACCUMULATION", evidence


def _icu_resource_evidence(db: Session) -> tuple[int, int, int]:
    icu_ids = _icu_department_ids(db)
    departments = db.query(Department).filter(Department.department_id.in_(icu_ids)).all()
    total = sum(department.capacity or 0 for department in departments)
    beds = db.query(Bed).filter(Bed.department_id.in_(icu_ids)).all() if icu_ids else []
    bed_ids = [bed.bed_id for bed in beds]
    occupied = db.query(BedAssignment.bed_id).filter(
        BedAssignment.bed_id.in_(bed_ids),
        BedAssignment.status.ilike("active"),
        BedAssignment.end_time.is_(None),
    ).distinct().count() if bed_ids else 0
    available = max(0, total - occupied) if total else 0
    return total, occupied, available


@router.get("/queue", response_model=ERQueueResponse)
def get_er_queue(db: Session = Depends(get_db)):
    as_of, patients = _queue_items(db)
    return ERQueueResponse(as_of=as_of, patients=patients)


@router.get("/metrics", response_model=ERMetricsResponse)
def get_er_metrics(db: Session = Depends(get_db)):
    as_of, patients = _queue_items(db)
    counts = Counter(patient.current_status for patient in patients)
    waits = [patient.waiting_minutes for patient in patients]
    longest = max(patients, key=lambda patient: patient.waiting_minutes, default=None)
    return ERMetricsResponse(
        as_of=as_of,
        total_active_patients=len(patients),
        patients_waiting_for_assessment=counts["WAITING_FOR_ASSESSMENT"],
        average_wait_minutes=round(mean(waits)) if waits else 0,
        longest_wait_minutes=longest.waiting_minutes if longest else 0,
        longest_waiting_patient_id=longest.patient_id if longest else None,
        patients_in_assessment=counts["IN_ASSESSMENT"],
        patients_in_treatment=counts["IN_TREATMENT"],
        patients_waiting_for_icu=counts["WAITING_FOR_ICU"],
        flow={status: counts.get(status, 0) for status in [
            "ARRIVED", "REGISTERED", "TRIAGED", "WAITING_FOR_ASSESSMENT",
            "IN_ASSESSMENT", "IN_TREATMENT", "WAITING_FOR_DISPOSITION",
            "WAITING_FOR_ICU", "OBSERVATION", "ADMITTED",
        ]},
    )


@router.get("/bottlenecks", response_model=ERBottleneckResponse)
def get_er_bottlenecks(db: Session = Depends(get_db)):
    as_of, patients = _queue_items(db)
    by_status: Dict[str, List[ERQueueItem]] = {}
    for patient in patients:
        by_status.setdefault(patient.current_status, []).append(patient)

    bottlenecks = []
    er_ids = _er_department_ids(db)

    def add_staff_bottleneck(type_name: str, status: str, roles: tuple[str, ...], label: str, explanation: str):
        affected = by_status.get(status, [])
        if not affected:
            return
        available = _available_staff(db, er_ids, roles)
        average_wait = round(mean([item.waiting_minutes for item in affected]))
        cause, evidence = _cause_for(type_name, affected, available, label)
        if len(affected) <= available and average_wait < 30:
            return
        severity = "HIGH" if available == 0 or len(affected) >= max(available * 2, 1) or average_wait >= 60 else "MEDIUM"
        bottlenecks.append(ERBottleneck(
            bottleneck_type=type_name,
            severity=severity,
            affected_patient_count=len(affected),
            average_wait_minutes=average_wait,
            explanation=explanation,
            cause_type=cause,
            cause_evidence=evidence,
        ))

    add_staff_bottleneck(
        "PHYSICIAN_ASSESSMENT", "WAITING_FOR_ASSESSMENT", ("doctor", "physician"),
        "physicians", "Patients are waiting for physician assessment relative to available ER physician capacity.",
    )
    add_staff_bottleneck(
        "TRIAGE_CAPACITY", "ARRIVED", ("nurse",), "nurses",
        "Patients are waiting for nurse triage relative to available ER nurse capacity.",
    )
    add_staff_bottleneck(
        "DISPOSITION", "WAITING_FOR_DISPOSITION", ("doctor", "physician", "nurse"), "disposition staff",
        "Patients are waiting for disposition relative to available ER disposition staff capacity.",
    )

    waiting_icu = by_status.get("WAITING_FOR_ICU", [])
    total_icu, occupied_icu, available_icu = _icu_resource_evidence(db)
    if waiting_icu and total_icu:
        occupancy = occupied_icu / total_icu
        average_wait = round(mean([item.waiting_minutes for item in waiting_icu]))
        severity = "HIGH" if available_icu == 0 or occupancy >= .95 else "MEDIUM"
        evidence = [
            f"{len(waiting_icu)} patients waiting for ICU",
            f"{occupied_icu}/{total_icu} ICU beds occupied",
            f"{available_icu} ICU beds available",
        ]
        bottlenecks.append(ERBottleneck(
            bottleneck_type="ICU_CAPACITY",
            severity=severity,
            affected_patient_count=len(waiting_icu),
            average_wait_minutes=average_wait,
            explanation="Patients are waiting for ICU placement while ICU capacity is constrained.",
            cause_type="ICU_CAPACITY",
            cause_evidence=evidence,
        ))

    as_of_window = as_of - timedelta(hours=24) if as_of else None
    pending_transfer_query = db.query(Transfer).filter(
        Transfer.status.ilike("waiting"),
        Transfer.request_time.isnot(None),
        Transfer.request_time >= as_of_window if as_of_window else True,
        Transfer.request_time <= as_of if as_of else True,
    )
    pending_transfer_rows = pending_transfer_query.all()
    pending_transfers = len(pending_transfer_rows)
    transfer_waits = [
        max(0, round((as_of - transfer.request_time).total_seconds() / 60))
        for transfer in pending_transfer_rows
    ] if as_of else []
    if pending_transfers and pending_transfers > available_icu:
        bottlenecks.append(ERBottleneck(
            bottleneck_type="TRANSFER_CAPACITY",
            severity="HIGH",
            affected_patient_count=pending_transfers,
            average_wait_minutes=round(mean(transfer_waits)) if transfer_waits else 0,
            explanation="Pending transfers exceed available destination ICU capacity.",
            cause_type="ICU_CAPACITY",
            cause_evidence=[
                f"{pending_transfers} pending transfers",
                f"{available_icu} ICU beds available",
            ],
        ))
    bottlenecks.sort(key=lambda item: (item.severity != "HIGH", -item.affected_patient_count, -item.average_wait_minutes))
    return ERBottleneckResponse(as_of=as_of, bottlenecks=bottlenecks)
