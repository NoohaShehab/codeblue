from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.departments import router as departments_router
from api.beds import router as beds_router
from api.visits import router as visits_router
from api.telemetry import router as telemetry_router
from api.events import router as events_router
from api.digital_twin import router as digital_twin_router
from api.ai import router as ai_router
from api.forecast import router as forecast_router
from api.icu_forecast import router as icu_forecast_router

app = FastAPI(title="Hospital Digital Twin API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(departments_router)
app.include_router(beds_router)
app.include_router(visits_router)
app.include_router(telemetry_router)
app.include_router(events_router)
app.include_router(digital_twin_router)
app.include_router(ai_router)
app.include_router(forecast_router)
app.include_router(icu_forecast_router)

@app.get("/")
def root():
    return {"message": "Hospital Digital Twin API is active. Navigate to /docs for interactive Swagger UI."}