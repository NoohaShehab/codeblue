from datetime import date, datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.dependencies import get_db
from models import (
    Bed,
    BedAssignment,
    ClinicalNote,
    Department,
    HospitalEvent,
    Patient,
    PatientVisit,
    Transfer,
)

router = APIRouter(prefix="/api/digital-twin", tags=["Digital Twin"])


class DigitalTwinBedOut(BaseModel):
    bed_id: int
    bed_number: str
    department_id: int
    department_name: str
    bed_type: str
    status: str


class DigitalTwinSummaryOut(BaseModel):
    occupied: int
    ready: int
    cleaning: int
    blocked: int


class DigitalTwinDepartmentOut(BaseModel):
    department_id: int
    name: str
    occupancy: float
    available: int
    admissions_transit: int
    pending_transfers: int
    discharges_planned: int


class DigitalTwinOut(BaseModel):
    beds: List[DigitalTwinBedOut]
    summary: DigitalTwinSummaryOut
    departments: Dict[str, DigitalTwinDepartmentOut]
    last_updated: Optional[datetime]


class DigitalTwinBedDetails(BaseModel):
    bed_id: int
    bed_number: str
    bed_type: str
    status: str
    department_id: int
    department_name: str


class DigitalTwinPatientDetails(BaseModel):
    patient_id: int
    age: Optional[int]
    gender: Optional[str]
    severity: Optional[str]


class DigitalTwinVisitDetails(BaseModel):
    visit_id: int
    arrival_time: Optional[datetime]
    admission_time: Optional[datetime]
    status: Optional[str]


class DigitalTwinClinicalNoteDetails(BaseModel):
    note_id: int
    timestamp: Optional[datetime]
    note_type: Optional[str]
    note_text: Optional[str]


class DigitalTwinBedDetailsOut(BaseModel):
    bed: DigitalTwinBedDetails
    patient: Optional[DigitalTwinPatientDetails]
    visit: Optional[DigitalTwinVisitDetails]
    notes: List[DigitalTwinClinicalNoteDetails]


BED_STATUS_MAP = {
    "AVAILABLE": "ready",
    "OCCUPIED": "occupied",
    "MAINTENANCE": "blocked",
    "CLEANING": "cleaning",
    "BLOCKED": "blocked",
}


def normalize_bed_status(status: Optional[str]) -> str:
    normalized = (status or "").strip().upper()
    return BED_STATUS_MAP.get(normalized, normalized.lower() or "blocked")


def department_key(department: Department) -> str:
    return "-".join(department.name.lower().split())


def latest_timestamp(*values: Optional[datetime]) -> Optional[datetime]:
    timestamps = [value for value in values if value is not None]
    return max(timestamps) if timestamps else None


def calculate_age(date_of_birth: Optional[date], today: Optional[date] = None) -> Optional[int]:
    if date_of_birth is None:
        return None
    reference_date = today or date.today()
    return reference_date.year - date_of_birth.year - (
        (reference_date.month, reference_date.day)
        < (date_of_birth.month, date_of_birth.day)
    )


@router.get("/beds/{bed_id}", response_model=DigitalTwinBedDetailsOut)
def get_digital_twin_bed_details(bed_id: int, db: Session = Depends(get_db)):
    bed_row = (
        db.query(Bed, Department)
        .join(Department, Bed.department_id == Department.department_id)
        .filter(Bed.bed_id == bed_id)
        .first()
    )
    if bed_row is None:
        raise HTTPException(status_code=404, detail="Bed not found")

    bed, department = bed_row
    bed_details = DigitalTwinBedDetails(
        bed_id=bed.bed_id,
        bed_number=bed.bed_number,
        bed_type=bed.bed_type,
        status=normalize_bed_status(bed.status),
        department_id=bed.department_id,
        department_name=department.name,
    )

    if bed_details.status != "occupied":
        return DigitalTwinBedDetailsOut(
            bed=bed_details,
            patient=None,
            visit=None,
            notes=[],
        )

    assignment = (
        db.query(BedAssignment)
        .filter(
            BedAssignment.bed_id == bed_id,
            func.upper(BedAssignment.status) == "ACTIVE",
            BedAssignment.end_time.is_(None),
        )
        .order_by(BedAssignment.start_time.desc())
        .first()
    )
    if assignment is None:
        return DigitalTwinBedDetailsOut(
            bed=bed_details,
            patient=None,
            visit=None,
            notes=[],
        )

    patient = db.query(Patient).filter(Patient.patient_id == assignment.patient_id).first()
    if patient is None:
        return DigitalTwinBedDetailsOut(
            bed=bed_details,
            patient=None,
            visit=None,
            notes=[],
        )

    visit = (
        db.query(PatientVisit)
        .filter(PatientVisit.patient_id == patient.patient_id)
        .order_by(
            PatientVisit.discharge_time.is_(None).desc(),
            PatientVisit.admission_time.desc(),
            PatientVisit.arrival_time.desc(),
        )
        .first()
    )
    notes_query = db.query(ClinicalNote).filter(ClinicalNote.patient_id == patient.patient_id)
    if visit is not None:
        notes_query = notes_query.filter(ClinicalNote.visit_id == visit.visit_id)
    notes = notes_query.order_by(ClinicalNote.timestamp.desc()).all()

    return DigitalTwinBedDetailsOut(
        bed=bed_details,
        patient=DigitalTwinPatientDetails(
            patient_id=patient.patient_id,
            age=calculate_age(patient.date_of_birth),
            gender=patient.gender,
            severity=patient.severity,
        ),
        visit=(
            DigitalTwinVisitDetails(
                visit_id=visit.visit_id,
                arrival_time=visit.arrival_time,
                admission_time=visit.admission_time,
                status=visit.status,
            )
            if visit is not None
            else None
        ),
        notes=[
            DigitalTwinClinicalNoteDetails(
                note_id=note.note_id,
                timestamp=note.timestamp,
                note_type=note.note_type,
                note_text=note.note_text,
            )
            for note in notes
        ],
    )


@router.get("", response_model=DigitalTwinOut)
def get_digital_twin(db: Session = Depends(get_db)):
    bed_rows = (
        db.query(Bed, Department)
        .join(Department, Bed.department_id == Department.department_id)
        .order_by(Department.department_id, Bed.bed_id)
        .all()
    )

    beds = [
        DigitalTwinBedOut(
            bed_id=bed.bed_id,
            bed_number=bed.bed_number,
            department_id=bed.department_id,
            department_name=department.name,
            bed_type=bed.bed_type,
            status=normalize_bed_status(bed.status),
        )
        for bed, department in bed_rows
    ]

    summary_counts = {"occupied": 0, "ready": 0, "cleaning": 0, "blocked": 0}
    for bed in beds:
        if bed.status in summary_counts:
            summary_counts[bed.status] += 1

    bed_counts = {
        (department_id, status): count
        for department_id, status, count in db.query(
            Bed.department_id, Bed.status, func.count(Bed.bed_id)
        )
        .group_by(Bed.department_id, Bed.status)
        .all()
    }
    waiting_transfers = dict(
        db.query(Transfer.to_department_id, func.count(Transfer.transfer_id))
        .filter(func.upper(Transfer.status) == "WAITING")
        .group_by(Transfer.to_department_id)
        .all()
    )

    departments = {}
    for department in db.query(Department).order_by(Department.department_id).all():
        department_beds = [
            (status, count)
            for (department_id, status), count in bed_counts.items()
            if department_id == department.department_id
        ]
        occupied = sum(
            count
            for status, count in department_beds
            if normalize_bed_status(status) == "occupied"
        )
        available = sum(
            count
            for status, count in department_beds
            if normalize_bed_status(status) == "ready"
        )
        denominator = department.capacity or sum(count for _, count in department_beds)
        occupancy = round(occupied / denominator * 100, 1) if denominator else 0
        waiting = waiting_transfers.get(department.department_id, 0)

        # The schema has no separate admission queue. Waiting transfers into a
        # department are the available database-backed proxy for both metrics.
        departments[department_key(department)] = DigitalTwinDepartmentOut(
            department_id=department.department_id,
            name=department.name,
            occupancy=occupancy,
            available=available,
            admissions_transit=waiting,
            pending_transfers=waiting,
            # patient_visits has no planned-discharge field or status.
            discharges_planned=0,
        )

    latest_event = db.query(func.max(HospitalEvent.event_time)).scalar()
    latest_transfer_request = db.query(func.max(Transfer.request_time)).scalar()
    latest_transfer = db.query(func.max(Transfer.transfer_time)).scalar()
    latest_visit_arrival = db.query(func.max(PatientVisit.arrival_time)).scalar()
    latest_visit_admission = db.query(func.max(PatientVisit.admission_time)).scalar()
    latest_visit_discharge = db.query(func.max(PatientVisit.discharge_time)).scalar()

    return DigitalTwinOut(
        beds=beds,
        summary=DigitalTwinSummaryOut(**summary_counts),
        departments=departments,
        last_updated=latest_timestamp(
            latest_event,
            latest_transfer_request,
            latest_transfer,
            latest_visit_arrival,
            latest_visit_admission,
            latest_visit_discharge,
        ),
    )
