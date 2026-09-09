"""Seed synthetic active ER encounters for local Digital Twin demonstrations.

This is an explicit development-data command. It does not run during API requests
and does not alter existing patients, visits, or triage records.
"""
from datetime import timedelta

from database import SessionLocal, ensure_patient_visit_flow_columns
from models import Department, HospitalEvent, Patient, PatientVisit, Triage


DEMO_ENCOUNTERS = [
    (95, "WAITING_FOR_ASSESSMENT", 2, "NORMAL"),
    (80, "WAITING_FOR_ASSESSMENT", 3, "HIGH"),
    (65, "WAITING_FOR_ASSESSMENT", 4, "HIGH"),
    (50, "WAITING_FOR_ASSESSMENT", 2, "NORMAL"),
    (40, "WAITING_FOR_ASSESSMENT", 3, "HIGH"),
    (55, "IN_ASSESSMENT", 2, "NORMAL"),
    (45, "IN_ASSESSMENT", 4, "HIGH"),
    (70, "IN_TREATMENT", 3, "HIGH"),
    (60, "IN_TREATMENT", 2, "NORMAL"),
    (110, "IN_TREATMENT", 5, "CRITICAL"),
    (100, "WAITING_FOR_DISPOSITION", 2, "NORMAL"),
    (130, "WAITING_FOR_ICU", 4, "HIGH"),
    (85, "WAITING_FOR_ICU", 5, "CRITICAL"),
]


def seed() -> None:
    ensure_patient_visit_flow_columns()
    db = SessionLocal()
    try:
        er = (
            db.query(Department)
            .filter(Department.type.ilike("%er%"))
            .first()
        )
        if er is None:
            raise RuntimeError("No ER department exists in the database.")

        active_count = (
            db.query(PatientVisit)
            .filter(
                PatientVisit.department_id == er.department_id,
                PatientVisit.discharge_time.is_(None),
                PatientVisit.current_status.isnot(None),
            )
            .count()
        )
        if active_count:
            print(f"Skipped: {active_count} active ER encounters already exist.")
            return

        anchor = (
            db.query(PatientVisit.arrival_time)
            .order_by(PatientVisit.arrival_time.desc())
            .first()
        )
        if anchor is None or anchor[0] is None:
            raise RuntimeError("No visit timestamp exists to anchor synthetic data.")
        anchor_time = anchor[0]

        patient_ids = [row[0] for row in db.query(Patient.patient_id).limit(len(DEMO_ENCOUNTERS)).all()]
        if len(patient_ids) < len(DEMO_ENCOUNTERS):
            raise RuntimeError("Not enough patients exist to seed the ER demo.")

        next_visit_id = (db.query(PatientVisit.visit_id).order_by(PatientVisit.visit_id.desc()).first()[0] or 0) + 1
        next_triage_id = (db.query(Triage.triage_id).order_by(Triage.triage_id.desc()).first()[0] or 0) + 1
        for index, (minutes_ago, status, level, priority) in enumerate(DEMO_ENCOUNTERS):
            arrival = anchor_time - timedelta(minutes=minutes_ago)
            triage_time = arrival + timedelta(minutes=8)
            assessment_start = triage_time + timedelta(minutes=12)
            assessment_end = assessment_start + timedelta(minutes=18)
            treatment_start = assessment_end + timedelta(minutes=5)
            disposition_time = treatment_start + timedelta(minutes=22)
            visit = PatientVisit(
                visit_id=next_visit_id + index,
                patient_id=patient_ids[index],
                department_id=er.department_id,
                arrival_time=arrival,
                admission_time=None,
                discharge_time=None,
                severity={1: "Low", 2: "Medium", 3: "High", 4: "High", 5: "Critical"}[level],
                status="ACTIVE",
                registration_time=arrival + timedelta(minutes=3),
                assessment_start_time=assessment_start if status in {"IN_ASSESSMENT", "IN_TREATMENT", "WAITING_FOR_DISPOSITION", "WAITING_FOR_ICU"} else None,
                assessment_end_time=assessment_end if status in {"IN_TREATMENT", "WAITING_FOR_DISPOSITION", "WAITING_FOR_ICU"} else None,
                treatment_start_time=treatment_start if status in {"IN_TREATMENT", "WAITING_FOR_DISPOSITION", "WAITING_FOR_ICU"} else None,
                disposition_time=disposition_time if status == "WAITING_FOR_ICU" else None,
                current_status=status,
                disposition="ICU" if status == "WAITING_FOR_ICU" else None,
                updated_at=anchor_time,
            )
            db.add(visit)
            db.add(
                Triage(
                    triage_id=next_triage_id + index,
                    visit_id=visit.visit_id,
                    timestamp=triage_time,
                    severity_level=level,
                    chief_complaint="Synthetic operational demo presentation",
                    priority=priority,
                )
            )

        db.commit()
        print(f"Seeded {len(DEMO_ENCOUNTERS)} synthetic active ER encounters.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
