from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from pydantic import BaseModel

from api.dependencies import get_db
from models import HospitalEvent, Bed, Patient, PatientVisit

router = APIRouter(prefix="/api/events", tags=["Events & Summary"])

class HospitalEventOut(BaseModel):
    event_id: int
    visit_id: int
    department_id: int
    staff_id: int
    event_type: str
    event_time: datetime
    details: str
    class Config:
        from_attributes = True

class SummaryOut(BaseModel):
    total_beds: int
    occupied_beds: int
    bed_occupancy_rate: float
    total_patients: int
    active_visits: int
    critical_events_count: int

@router.get("", response_model=List[HospitalEventOut])
def list_events(limit: int = Query(default=20, le=100), db: Session = Depends(get_db)):
    return db.query(HospitalEvent).order_by(HospitalEvent.event_time.desc()).limit(limit).all()

@router.get("/summary", response_model=SummaryOut)
def get_summary(db: Session = Depends(get_db)):
    total_beds = db.query(Bed).count()
    occupied_beds = db.query(Bed).filter(Bed.status.ilike("occupied")).count()
    occupancy_rate = (occupied_beds / total_beds * 100.0) if total_beds > 0 else 0.0
    total_patients = db.query(Patient).count()
    active_visits = db.query(PatientVisit).filter(PatientVisit.status.ilike("active")).count()
    critical_count = db.query(HospitalEvent).filter(
        HospitalEvent.event_type.ilike("%code blue%") | HospitalEvent.event_type.ilike("%alert%")
    ).count()

    return SummaryOut(
        total_beds=total_beds,
        occupied_beds=occupied_beds,
        bed_occupancy_rate=round(occupancy_rate, 2),
        total_patients=total_patients,
        active_visits=active_visits,
        critical_events_count=critical_count,
    )