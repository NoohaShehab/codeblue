import os
import pandas as pd
from database import engine, Base, SessionLocal
from models import (
    Department,
    Patient,
    Staff,
    Bed,
    Equipment,
    PatientVisit,
    Triage,
    BedAssignment,
    EquipmentUsage,
    ClinicalNote,
    Transfer,
    HospitalEvent,
)

# Recreate all tables cleanly
Base.metadata.create_all(bind=engine)

db = SessionLocal()

to_datetime = lambda val: pd.to_datetime(val) if pd.notna(val) else None
to_date = lambda val: pd.to_datetime(val).date() if pd.notna(val) else None
to_nullable_int = lambda val: int(float(val)) if pd.notna(val) else None

DATA_DIR = "../data"

try:
    # 1. Level 1: Master Tables
    print("Loading Level 1: Departments & Patients...")
    depts_df = pd.read_csv(os.path.join(DATA_DIR, "departments.csv"))
    for _, r in depts_df.iterrows():
        db.add(Department(
            department_id=int(r["department_id"]),
            name=str(r["name"]),
            type=str(r["type"]),
            location=str(r["location"]),
            capacity=int(r["capacity"]),
        ))

    patients_df = pd.read_csv(os.path.join(DATA_DIR, "patients.csv"))
    for _, r in patients_df.iterrows():
        db.add(Patient(
            patient_id=int(r["patient_id"]),
            date_of_birth=to_date(r["date_of_birth"]),
            gender=str(r["gender"]),
            severity=str(r["severity"]),
        ))
    db.commit()

    # 2. Level 2: Department Assets & Personnel
    print("Loading Level 2: Staff, Beds, Equipment...")
    staff_df = pd.read_csv(os.path.join(DATA_DIR, "staff.csv"))
    for _, r in staff_df.iterrows():
        db.add(Staff(
            staff_id=int(r["staff_id"]),
            department_id=int(r["department_id"]),
            name=str(r["name"]),
            role=str(r["role"]),
            shift=str(r["shift"]),
            status=str(r["status"]),
        ))

    beds_df = pd.read_csv(os.path.join(DATA_DIR, "beds.csv"))
    for _, r in beds_df.iterrows():
        db.add(Bed(
            bed_id=int(r["bed_id"]),
            department_id=int(r["department_id"]),
            bed_number=str(r["bed_number"]),
            bed_type=str(r["bed_type"]),
            status=str(r["status"]),
        ))

    equipment_df = pd.read_csv(os.path.join(DATA_DIR, "equipment.csv"))
    for _, r in equipment_df.iterrows():
        db.add(Equipment(
            equipment_id=int(r["equipment_id"]),
            department_id=int(r["department_id"]),
            equipment_type=str(r["equipment_type"]),
            status=str(r["status"]),
            last_maintenance=to_datetime(r["last_maintenance"]),
        ))
    db.commit()

    # 3. Level 3: Patient Encounters (Visits)
    print("Loading Level 3: Patient Visits...")
    visits_df = pd.read_csv(os.path.join(DATA_DIR, "patient_visits.csv"))
    for _, r in visits_df.iterrows():
        db.add(PatientVisit(
            visit_id=int(r["visit_id"]),
            patient_id=int(r["patient_id"]),
            department_id=int(r["department_id"]),
            arrival_time=to_datetime(r["arrival_time"]),
            admission_time=to_datetime(r["admission_time"]),
            discharge_time=to_datetime(r["discharge_time"]),
            severity=str(r["severity"]),
            status=str(r["status"]),
        ))
    db.commit()

    # 4. Level 4: Clinical Tracking, Operations & Telemetry
    print("Loading Level 4: Triage, Bed Assignments, Usage, Notes, Transfers, Events...")
    triage_df = pd.read_csv(os.path.join(DATA_DIR, "triage.csv"))
    for _, r in triage_df.iterrows():
        db.add(Triage(
            triage_id=int(r["triage_id"]),
            visit_id=int(r["visit_id"]),
            timestamp=to_datetime(r["timestamp"]),
            severity_level=int(r["severity_level"]),
            chief_complaint=str(r["chief_complaint"]),
            priority=str(r["priority"]),
        ))

    bed_assign_df = pd.read_csv(os.path.join(DATA_DIR, "bed_assignments.csv"))
    for _, r in bed_assign_df.iterrows():
        db.add(BedAssignment(
            assignment_id=int(r["assignment_id"]),
            bed_id=int(r["bed_id"]),
            patient_id=int(r["patient_id"]),
            start_time=to_datetime(r["start_time"]),
            end_time=to_datetime(r["end_time"]),
            status=str(r["status"]),
        ))

    equip_usage_df = pd.read_csv(os.path.join(DATA_DIR, "equipment_usage.csv"))
    for _, r in equip_usage_df.iterrows():
        db.add(EquipmentUsage(
            usage_id=int(r["usage_id"]),
            equipment_id=int(r["equipment_id"]),
            patient_id=int(r["patient_id"]),
            start_time=to_datetime(r["start_time"]),
            end_time=to_datetime(r["end_time"]),
        ))

    notes_df = pd.read_csv(os.path.join(DATA_DIR, "clinical_notes.csv"))
    for _, r in notes_df.iterrows():
        db.add(ClinicalNote(
            note_id=int(r["note_id"]),
            patient_id=int(r["patient_id"]),
            visit_id=int(r["visit_id"]),
            department_id=int(r["department_id"]),
            timestamp=to_datetime(r["timestamp"]),
            note_type=str(r["note_type"]),
            note_text=str(r["note_text"]),
        ))

    transfers_df = pd.read_csv(os.path.join(DATA_DIR, "transfers.csv"))
    for _, r in transfers_df.iterrows():
        db.add(Transfer(
            transfer_id=int(r["transfer_id"]),
            patient_id=int(r["patient_id"]),
            from_department_id=int(r["from_department_id"]),
            to_department_id=int(r["to_department_id"]),
            from_bed_id=to_nullable_int(r["from_bed_id"]),
            to_bed_id=to_nullable_int(r["to_bed_id"]),
            request_time=to_datetime(r["request_time"]),
            transfer_time=to_datetime(r["transfer_time"]),
            status=str(r["status"]),
        ))

    events_df = pd.read_csv(os.path.join(DATA_DIR, "hospital_events.csv"))
    for _, r in events_df.iterrows():
        db.add(HospitalEvent(
            event_id=int(r["event_id"]),
            event_time=to_datetime(r["event_time"]),
            event_type=str(r["event_type"]),
            bed_id=to_nullable_int(r["bed_id"]),
            patient_id=to_nullable_int(r["patient_id"]),
        ))
    db.commit()

    print("Success: All 12 tables loaded cleanly without errors.")
except Exception as e:
    db.rollback()
    print(f"Error loading data: {e}")
    raise
finally:
    db.close()