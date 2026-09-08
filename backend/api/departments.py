from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from api.dependencies import get_db
from models import Department, Staff

router = APIRouter(prefix="/api/departments", tags=["Departments"])

class DepartmentOut(BaseModel):
    department_id: int
    name: str
    floor: str
    bed_capacity: int
    class Config:
        from_attributes = True

class StaffOut(BaseModel):
    staff_id: int
    department_id: int
    full_name: str
    role: str
    class Config:
        from_attributes = True

@router.get("", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()

@router.get("/{dept_id}/staff", response_model=List[StaffOut])
def list_department_staff(dept_id: int, db: Session = Depends(get_db)):
    return db.query(Staff).filter(Staff.department_id == dept_id).all()