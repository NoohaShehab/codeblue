from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, Text, ForeignKey
from database import Base

# --- Master / Dimension Tables ---

class Department(Base):
    __tablename__ = "departments"
    department_id = Column(Integer, primary_key=True) 
    name = Column(String) 
    floor = Column(String) 
    bed_capacity = Column(Integer) 

class Patient(Base):
    __tablename__ = "patients"
    patient_id = Column(Integer, primary_key=True) 
    full_name = Column(String) 
    dob = Column(Date) 
    gender = Column(String) 
    blood_type = Column(String) 

class Staff(Base):
    __tablename__ = "staff"
    staff_id = Column(Integer, primary_key=True) 
    department_id = Column(Integer, ForeignKey("departments.department_id")) 
    full_name = Column(String) 
    role = Column(String) 

class Bed(Base):
    __tablename__ = "beds"
    bed_id = Column(Integer, primary_key=True) 
    department_id = Column(Integer, ForeignKey("departments.department_id")) 
    room_number = Column(String) 
    bed_type = Column(String) 
    status = Column(String) 

class Equipment(Base):
    __tablename__ = "equipment"
    equipment_id = Column(Integer, primary_key=True) 
    department_id = Column(Integer, ForeignKey("departments.department_id")) 
    name = Column(String) 
    type = Column(String) 
    status = Column(String) 

# --- Core Clinical & Operational Tables ---

class PatientVisit(Base):
    __tablename__ = "patient_visits"
    visit_id = Column(Integer, primary_key=True) 
    patient_id = Column(Integer, ForeignKey("patients.patient_id")) 
    attending_staff_id = Column(Integer, ForeignKey("staff.staff_id")) 
    visit_type = Column(String)  # inpatient, outpatient, emergency 
    visit_start_time = Column(DateTime) 
    visit_end_time = Column(DateTime, nullable=True) 
    status = Column(String) 

class Triage(Base):
    __tablename__ = "triage"
    triage_id = Column(Integer, primary_key=True) 
    visit_id = Column(Integer, ForeignKey("patient_visits.visit_id")) 
    staff_id = Column(Integer, ForeignKey("staff.staff_id")) 
    triage_level = Column(Integer) 
    heart_rate = Column(Integer) 
    blood_pressure = Column(String) 
    temperature = Column(Numeric(4, 1)) 
    spo2 = Column(Integer) 
    triage_time = Column(DateTime) 

class BedAssignment(Base):
    __tablename__ = "bed_assignments"
    assignment_id = Column(Integer, primary_key=True) 
    visit_id = Column(Integer, ForeignKey("patient_visits.visit_id")) 
    bed_id = Column(Integer, ForeignKey("beds.bed_id")) 
    start_time = Column(DateTime) 
    end_time = Column(DateTime, nullable=True) 
    status = Column(String) 

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    note_id = Column(Integer, primary_key=True) 
    visit_id = Column(Integer, ForeignKey("patient_visits.visit_id")) 
    staff_id = Column(Integer, ForeignKey("staff.staff_id")) 
    note_type = Column(String)  # progress, discharge, nursing 
    note_text = Column(Text) 
    created_at = Column(DateTime) 

class EquipmentUsage(Base):
    __tablename__ = "equipment_usage"
    usage_id = Column(Integer, primary_key=True) 
    equipment_id = Column(Integer, ForeignKey("equipment.equipment_id")) 
    visit_id = Column(Integer, ForeignKey("patient_visits.visit_id")) 
    staff_id = Column(Integer, ForeignKey("staff.staff_id")) 
    start_time = Column(DateTime) 
    end_time = Column(DateTime, nullable=True) 

class Transfer(Base):
    __tablename__ = "transfers"
    transfer_id = Column(Integer, primary_key=True) 
    visit_id = Column(Integer, ForeignKey("patient_visits.visit_id")) 
    from_department_id = Column(Integer, ForeignKey("departments.department_id")) 
    to_department_id = Column(Integer, ForeignKey("departments.department_id")) 
    transfer_time = Column(DateTime) 
    reason = Column(String) 

class HospitalEvent(Base):
    __tablename__ = "hospital_events"
    event_id = Column(Integer, primary_key=True) 
    visit_id = Column(Integer, ForeignKey("patient_visits.visit_id")) 
    department_id = Column(Integer, ForeignKey("departments.department_id")) 
    staff_id = Column(Integer, ForeignKey("staff.staff_id")) 
    event_type = Column(String)  # code blue, rapid response, cleaning, alert 
    event_time = Column(DateTime) 
    details = Column(Text) 
