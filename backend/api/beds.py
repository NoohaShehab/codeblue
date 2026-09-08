from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from api.dependencies import get_db
from models import Bed, BedAssignment

router = APIRouter(prefix="/api/beds", tags=["Beds & Assignments"])

class BedOut(BaseModel):
    bed_id: int
    department_id: int
    bed_number: str
    bed_type: str
    status: str
    class Config:
        from_attributes = True

class BedAssignmentOut(BaseModel):
    assignment_id: int
    visit_id: int
    bed_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    class Config:
        from_attributes = True

@router.get("", response_model=List[BedOut])
def list_beds(department_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Bed)
    if department_id:
        query = query.filter(Bed.department_id == department_id)
    return query.all()

@router.get("/assignments", response_model=List[BedAssignmentOut])
def list_bed_assignments(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(BedAssignment)
    if active_only:
        query = query.filter(BedAssignment.status.ilike("active"))
    return query.all()
