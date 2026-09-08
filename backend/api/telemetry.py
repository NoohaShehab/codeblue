from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from api.dependencies import get_db
from models import Triage, Equipment, EquipmentUsage

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry & Equipment"])

class TriageOut(BaseModel):
    triage_id: int
    visit_id: int
    staff_id: int
    triage_level: int
    heart_rate: Optional[int] = None
    blood_pressure: Optional[str] = None
    temperature: Optional[float] = None
    spo2: Optional[int] = None
    triage_time: datetime
    class Config:
        from_attributes = True

class EquipmentOut(BaseModel):
    equipment_id: int
    department_id: int
    name: str
    type: str
    status: str
    class Config:
        from_attributes = True

@router.get("/triage/{visit_id}", response_model=List[TriageOut])
def get_vitals_by_visit(visit_id: int, db: Session = Depends(get_db)):
    return db.query(Triage).filter(Triage.visit_id == visit_id).order_by(Triage.triage_time.asc()).all()

@router.get("/equipment", response_model=List[EquipmentOut])
def list_equipment(db: Session = Depends(get_db)):
    return db.query(Equipment).all()