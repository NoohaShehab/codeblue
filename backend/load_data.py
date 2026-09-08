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
    ClinicalNote,
    EquipmentUsage,
    Transfer,
    HospitalEvent,
)

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Helper for nullable date/time strings
to_datetime = lambda val: pd.to_datetime(val) if pd.notna(val) else None
to_date = lambda val: pd.to_datetime(val).date() if pd.notna(val) else None

try:
    # 1. Level 1: Independent Tables
    depts_df = pd.read_csv("../data/departments.csv")
    for _, r in depts_df.iterrows():
        db.add(Department(
            department_id=int(r["department_id"]),
            name=str(r["name"]),
            floor=str(r["floor"]),
            bed_capacity=int(r["bed_capacity"])
        ))

    patients_df = pd.read_csv("../data/patients.csv")
    for _, r in patients_df.iterrows():
        db.add(Patient(
            patient_id=int(r["patient_id"]),
            full_name=str(r["full_name"]),
            dob=to_date(r["dob"]),
            gender=str(r["gender"]),
            blood_type=str(r["blood_type"])
        ))
    db.flush()

    # 2. Level 2: Department Assets & Personnel
    staff_df = pd.read_csv("../data/staff.csv")
    for _, r in staff_df.iterrows():
        db.add(Staff(
            staff_id=int(r["staff_id"]),
            department_id=int(r["department_id"]),
            full_name=str(r["full_name"]),
            role=str(r["role"])
        ))

    beds_df = pd.read_csv("../data/beds.csv")
    for _, r in beds_df.iterrows():
        db.add(Bed(
            bed_id=int(r["bed_id"]),
            department_id=int(r["department_id"]),
            room_number=str(r["room_number"]),
            bed_type=str(r["bed_type"]),
            status=str(r["status"])
        ))

    equipment_df = pd.read_csv("../data/equipment.csv")
    for _, r in equipment_df.iterrows():
        db.add(Equipment(
            equipment_id=int(r["equipment_id"]),
            department_id=int(r["department_id"]),
            name=str(r["name"]),
            type=str(r["type"]),
            status=str(r["status"])
        ))
    db.flush()

    # 3. Level 3: Patient Encounters (Visits)
    visits_df = pd.read_csv("../data/patient_visits.csv")
    for _, r in visits_df.iterrows():
        db.add(PatientVisit(
            visit_id=int(r["visit_id"]),
            patient_id=int(r["patient_id"]),
            attending_staff_id=int(r["attending_staff_id"]),
            visit_type=str(r["visit_type"]),
            visit_start_time=to_datetime(r["visit_start_time"]),
            visit_end_time=to_datetime(r["visit_end_time"]),
            status=str(r["status"])
        ))
    db.flush()

    # 4. Level 4: Visit Telemetry, Movements, Notes & Allocations
    triage_df = pd.read_csv("../data/triage.csv")
    for _, r in triage_df.iterrows():
        db.add(Triage(
            triage_id=int(r["triage_id"]),
            visit_id=int(r["visit_id"]),
            staff_id=int(r["staff_id"]),
            triage_level=int(r["triage_level"]),
            heart_rate=int(r["heart_rate"]) if pd.notna(r["heart_rate"]) else None,
            blood_pressure=str(r["blood_pressure"]) if pd.notna(r["blood_pressure"]) else None,
            temperature=float(r["temperature"]) if pd.notna(r["temperature"]) else None,
            spo2=int(r["spo2"]) if pd.notna(r["spo2"]) else None,
            triage_time=to_datetime(r["triage_time"])
        ))

    bed_assignments_df = pd.read_csv("../data/bed_assignments.csv")
    for _, r in bed_assignments_df.iterrows():
        db.add(BedAssignment(
            assignment_id=int(r["assignment_id"]),
            visit_id=int(r["visit_id"]),
            bed_id=int(r["bed_id"]),
            start_time=to_datetime(r["start_time"]),
            end_time=to_datetime(r["end_time"]),
            status=str(r["status"])
        ))

    clinical_notes_df = pd.read_csv("../data/clinical_notes.csv")
    for _, r in clinical_notes_df.iterrows():
        db.add(ClinicalNote(
            note_id=int(r["note_id"]),
            visit_id=int(r["visit_id"]),
            staff_id=int(r["staff_id"]),
            note_type=str(r["note_type"]),
            note_text=str(r["note_text"]),
            created_at=to_datetime(r["created_at"])
        ))

    equipment_usage_df = pd.read_csv("../data/equipment_usage.csv")
    for _, r in equipment_usage_df.iterrows():
        db.add(EquipmentUsage(
            usage_id=int(r["usage_id"]),
            equipment_id=int(r["equipment_id"]),
            visit_id=int(r["visit_id"]),
            staff_id=int(r["staff_id"]),
            start_time=to_datetime(r["start_time"]),
            end_time=to_datetime(r["end_time"])
        ))

    transfers_df = pd.read_csv("../data/transfers.csv")
    for _, r in transfers_df.iterrows():
        db.add(Transfer(
            transfer_id=int(r["transfer_id"]),
            visit_id=int(r["visit_id"]),
            from_department_id=int(r["from_department_id"]),
            to_department_id=int(r["to_department_id"]),
            transfer_time=to_datetime(r["transfer_time"]),
            reason=str(r["reason"])
        ))

    events_df = pd.read_csv("../data/hospital_events.csv")
    for _, r in events_df.iterrows():
        db.add(HospitalEvent(
            event_id=int(r["event_id"]),
            visit_id=int(r["visit_id"]),
            department_id=int(r["department_id"]),
            staff_id=int(r["staff_id"]),
            event_type=str(r["event_type"]),
            event_time=to_datetime(r["event_time"]),
            details=str(r["details"])
        ))

    db.commit()
    print("All 12 datasets loaded successfully.")
except Exception as e:
    db.rollback()
    print(f"Error loading data: {e}")
    raise
finally:
    db.close()
    