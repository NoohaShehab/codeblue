import os
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Always resolve hospital.db next to this file unless DATABASE_URL is set.
# Relative sqlite:///./hospital.db would create a second empty DB if uvicorn
# is started from a different working directory.
BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "hospital.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_patient_visit_flow_columns() -> None:
    """Add nullable flow fields without replacing the existing SQLite database."""
    required_columns = {
        "registration_time": "DATETIME",
        "assessment_start_time": "DATETIME",
        "assessment_end_time": "DATETIME",
        "treatment_start_time": "DATETIME",
        "disposition_time": "DATETIME",
        "current_status": "VARCHAR",
        "disposition": "VARCHAR",
        "updated_at": "DATETIME",
    }
    with engine.begin() as connection:
        existing = {
            column["name"]
            for column in inspect(connection).get_columns("patient_visits")
        }
        for name, column_type in required_columns.items():
            if name not in existing:
                connection.execute(
                    text(f"ALTER TABLE patient_visits ADD COLUMN {name} {column_type}")
                )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()