from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel

from api.dependencies import get_db
from models import Patient, PatientVisit, ClinicalNote, Transfer

router = APIRouter(prefix="/api/visits", tags=["Patient Visits"])

class PatientOut(BaseModel):
    patient_id: int
    full_name: str
    dob: date
    gender: str
    blood_type: str
    class Config:
        from_attributes = True

class PatientVisitOut(BaseModel):
    visit_id: int
    patient_id: int
    attending_staff_id: int
    visit_type: str
    visit_start_time: datetime
    visit_end_time: Optional[datetime] = None
    status: str
    class Config:
        from_attributes = True

class ClinicalNoteOut(BaseModel):
    note_id: int
    visit_id: int
    staff_id: int
    note_type: str
    note_text: str
    created_at: datetime
    class Config:
        from_attributes = True

class TransferOut(BaseModel):
    transfer_id: int
    visit_id: int
    from_department_id: int
    to_department_id: int
    transfer_time: datetime
    reason: str
    class Config:
        from_attributes = True

@router.get("", response_model=List[PatientVisitOut])
def list_visits(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(PatientVisit)
    if status:
        query = query.filter(PatientVisit.status.ilike(status))
    return query.all()

@router.get("/{visit_id}/patient", response_model=PatientOut)
def get_visit_patient(visit_id: int, db: Session = Depends(get_db)):
    visit = db.query(PatientVisit).filter(PatientVisit.visit_id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    patient = db.query(Patient).filter(Patient.patient_id == visit.patient_id).first()
    return patient

@router.get("/{visit_id}/notes", response_model=List[ClinicalNoteOut])
def get_visit_notes(visit_id: int, db: Session = Depends(get_db)):
    return db.query(ClinicalNote).filter(ClinicalNote.visit_id == visit_id).order_by(ClinicalNote.created_at.desc()).all()

@router.get("/{visit_id}/transfers", response_model=List[TransferOut])
def get_visit_transfers(visit_id: int, db: Session = Depends(get_db)):
    return db.query(Transfer).filter(Transfer.visit_id == visit_id).order_by(Transfer.transfer_time.asc()).all()