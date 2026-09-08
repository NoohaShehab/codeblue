from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey
from database import Base

# --- Master / Dimension Tables ---

class Department(Base):
    __tablename__ = "departments"
    department_id = Column(Integer, primary_key=True)
    name = Column(String)
    type = Column(String)
    location = Column(String)
    capacity = Column(Integer)

class Patient(Base):
    __tablename__ = "patients"
    patient_id = Column(Integer, primary_key=True)
    date_of_birth = Column(Date)
    gender = Column(String)
    severity = Column(String)

class Staff(Base):
    __tablename__ = "staff"
    staff_id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.department_id"))
    name = Column(String)
    role = Column(String)
    shift = Column(String)
    status = Column(String)

class Bed(Base):
    __tablename__ = "beds"
    bed_id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.department_id"))
    bed_number = Column(String)
    bed_type = Column(String)
    status = Column(String)

class Equipment(Base):
    __tablename__ = "equipment"
    equipment_id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.department_id"))
    equipment_type = Column(String)
    status = Column(String)
    last_maintenance = Column(DateTime, nullable=True)

# --- Encounter & Workflow Tables ---

class PatientVisit(Base):
    __tablename__ = "patient_visits"
    visit_id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    department_id = Column(Integer, ForeignKey("departments.department_id"))
    arrival_time = Column(DateTime)
    admission_time = Column(DateTime, nullable=True)
    discharge_time = Column(DateTime, nullable=True)
    severity = Column(String)
    status = Column(String)

class Triage(Base):
    __tablename__ = "triage"
    triage_id = Column(Integer, primary_key=True)
    visit_id = Column(Integer, ForeignKey("patient_visits.visit_id"))
    timestamp = Column(DateTime)
    severity_level = Column(Integer)
    chief_complaint = Column(String)
    priority = Column(String)

class BedAssignment(Base):
    __tablename__ = "bed_assignments"
    assignment_id = Column(Integer, primary_key=True)
    bed_id = Column(Integer, ForeignKey("beds.bed_id"))
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)
    status = Column(String)

class EquipmentUsage(Base):
    __tablename__ = "equipment_usage"
    usage_id = Column(Integer, primary_key=True)
    equipment_id = Column(Integer, ForeignKey("equipment.equipment_id"))
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    note_id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    visit_id = Column(Integer, ForeignKey("patient_visits.visit_id"))
    department_id = Column(Integer, ForeignKey("departments.department_id"))
    timestamp = Column(DateTime)
    note_type = Column(String)
    note_text = Column(Text)

class Transfer(Base):
    __tablename__ = "transfers"
    transfer_id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    from_department_id = Column(Integer, ForeignKey("departments.department_id"))
    to_department_id = Column(Integer, ForeignKey("departments.department_id"))
    from_bed_id = Column(Integer, ForeignKey("beds.bed_id"), nullable=True)
    to_bed_id = Column(Integer, ForeignKey("beds.bed_id"), nullable=True)
    request_time = Column(DateTime)
    transfer_time = Column(DateTime, nullable=True)
    status = Column(String)

class HospitalEvent(Base):
    __tablename__ = "hospital_events"
    event_id = Column(Integer, primary_key=True)
    event_time = Column(DateTime)
    event_type = Column(String)
    bed_id = Column(Integer, ForeignKey("beds.bed_id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"), nullable=True)
    