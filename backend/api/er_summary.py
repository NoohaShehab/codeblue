
from datetime import datetime, timedelta
from statistics import median

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db
from models import (
    Bed,
    BedAssignment,
    Department,
    PatientVisit,
)


router = APIRouter(
    prefix="/api/er-summary",
    tags=["ER Summary"],
)


class ERSummary:
    pass


def get_er_department_ids(db: Session):
    """
    Find Emergency Room departments.

    We support common department names such as:
    Emergency
    Emergency Room
    ER
    Emergency Department
    """

    departments = (
        db.query(Department)
        .filter(
            Department.name.ilike("%emergency%")
            | Department.name.ilike("%emergency room%")
            | Department.name.ilike("%emergency department%")
            | Department.name.ilike("ER")
        )
        .all()
    )

    return [department.department_id for department in departments]


@router.get("")
def get_er_summary(db: Session = Depends(get_db)):
    """
    Return real-time ER KPIs calculated from the database.

    KPIs:
    - Current arrivals
    - Patients waiting
    - Waiting > 60 minutes
    - Median wait
    - Boarding patients
    """

    er_department_ids = get_er_department_ids(db)

    # ---------------------------------------------------------
    # Fallback:
    # If the database does not have a department explicitly
    # named Emergency / ER, use the department type.
    # ---------------------------------------------------------

    if not er_department_ids:
        er_departments = (
            db.query(Department)
            .filter(Department.type.ilike("%emergency%"))
            .all()
        )

        er_department_ids = [
            department.department_id
            for department in er_departments
        ]

    # If no ER department exists, return zero values instead
    # of crashing the frontend.
    if not er_department_ids:
        return {
            "current_arrivals": 0,
            "patients_waiting": 0,
            "waiting_over_60": 0,
            "median_wait_minutes": 0,
            "boarding": 0,
        }

    # ---------------------------------------------------------
    # Get ER visits
    # ---------------------------------------------------------

    visits = (
        db.query(PatientVisit)
        .filter(
            PatientVisit.department_id.in_(er_department_ids)
        )
        .all()
    )

    now = datetime.now()

    # ---------------------------------------------------------
    # Current arrivals
    #
    # Number of ER patients who arrived during the latest hour.
    # ---------------------------------------------------------

    one_hour_ago = now - timedelta(hours=1)

    current_arrivals = sum(
        1
        for visit in visits
        if visit.arrival_time
        and one_hour_ago <= visit.arrival_time <= now
    )

    # ---------------------------------------------------------
    # Patients waiting
    #
    # Arrived at ER but have not been admitted yet.
    # ---------------------------------------------------------

    waiting_visits = [
        visit
        for visit in visits
        if visit.arrival_time
        and visit.admission_time is None
        and visit.discharge_time is None
    ]

    patients_waiting = len(waiting_visits)

    # ---------------------------------------------------------
    # Waiting > 60 minutes
    # ---------------------------------------------------------

    waiting_over_60 = sum(
        1
        for visit in waiting_visits
        if visit.arrival_time
        and (now - visit.arrival_time).total_seconds() >= 60 * 60
    )

    # ---------------------------------------------------------
    # Median wait
    #
    # For completed ER admission flows:
    #
    # admission_time - arrival_time
    #
    # We use the median instead of the average because median
    # is less affected by extreme waiting times.
    # ---------------------------------------------------------

    wait_times = []

    for visit in visits:
        if (
            visit.arrival_time
            and visit.admission_time
            and visit.admission_time >= visit.arrival_time
        ):
            wait_minutes = (
                visit.admission_time - visit.arrival_time
            ).total_seconds() / 60

            wait_times.append(wait_minutes)

    median_wait_minutes = (
        round(median(wait_times))
        if wait_times
        else 0
    )

    # ---------------------------------------------------------
    # Boarding
    #
    # Patients who have been admitted but do not currently
    # have an active bed assignment.
    # ---------------------------------------------------------

    admitted_visits = [
        visit
        for visit in visits
        if visit.admission_time
        and visit.discharge_time is None
    ]

    boarding = 0

    for visit in admitted_visits:
        assignment = (
            db.query(BedAssignment)
            .filter(
                BedAssignment.patient_id == visit.patient_id,
                BedAssignment.start_time <= now,
                (
                    BedAssignment.end_time.is_(None)
                    | (BedAssignment.end_time > now)
                ),
                BedAssignment.status.ilike("active"),
            )
            .first()
        )

        if assignment is None:
            boarding += 1

    # ---------------------------------------------------------
    # Response
    # ---------------------------------------------------------

    return {
        "current_arrivals": current_arrivals,
        "patients_waiting": patients_waiting,
        "waiting_over_60": waiting_over_60,
        "median_wait_minutes": median_wait_minutes,
        "boarding": boarding,
    }

