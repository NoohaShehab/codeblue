from datetime import datetime
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from statsmodels.tsa.statespace.sarimax import SARIMAX

from database import get_db
from models import Department, PatientVisit


router = APIRouter(
    prefix="/api/forecast",
    tags=["Forecast"],
)


@router.get("")
def forecast_patient_arrivals(
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    """
    Forecast patient arrivals for the next N hours using SARIMAX.
    """

    # Get patient arrival timestamps from database
    er_department_ids = [
        department.department_id
        for department in db.query(Department).filter(
            Department.type.ilike("%er%")
            | Department.name.ilike("%emergency%")
        ).all()
    ]
    visit_query = db.query(PatientVisit.arrival_time).filter(
        PatientVisit.arrival_time.isnot(None)
    )
    if er_department_ids:
        visit_query = visit_query.filter(PatientVisit.department_id.in_(er_department_ids))
    visits = visit_query.order_by(PatientVisit.arrival_time).all()

    if not visits:
        raise HTTPException(
            status_code=404,
            detail="No patient arrival data available for forecasting.",
        )

    # Convert database result to DataFrame
    df = pd.DataFrame(
        [visit.arrival_time for visit in visits],
        columns=["arrival_time"],
    )

    df["arrival_time"] = pd.to_datetime(
        df["arrival_time"],
        errors="coerce",
    )

    # Remove invalid timestamps
    df = df.dropna(subset=["arrival_time"])

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="No valid arrival timestamps available.",
        )

    # Build hourly arrivals time series
    hourly_arrivals = (
        df.set_index("arrival_time")
        .resample("h")
        .size()
        .rename("arrivals")
    )

    # Make sure the series is continuous
    hourly_arrivals = hourly_arrivals.asfreq("h", fill_value=0)

    # Need enough history for daily seasonality (24 hours)
    if len(hourly_arrivals) < 48:
        raise HTTPException(
            status_code=400,
            detail=(
                "Insufficient historical data for forecasting. "
                "At least 48 hours of patient arrival data are required."
            ),
        )

    # SARIMAX model from the forecasting notebook
    model = SARIMAX(
        hourly_arrivals,
        order=(1, 0, 1),
        seasonal_order=(1, 0, 1, 24),
        enforce_stationarity=False,
        enforce_invertibility=False,
    )

    try:
        result = model.fit(disp=False)

        # Forecast future hours
        forecast_result = result.get_forecast(steps=hours)

        forecast_mean = forecast_result.predicted_mean
        confidence_interval = forecast_result.conf_int()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Forecasting failed: {str(e)}",
        )

    # Build forecast response
    forecast = []

    for timestamp in forecast_mean.index:
        predicted = max(0, round(float(forecast_mean.loc[timestamp])))

        lower = max(
            0,
            round(float(confidence_interval.loc[timestamp].iloc[0])),
        )

        upper = max(
            predicted,
            round(float(confidence_interval.loc[timestamp].iloc[1])),
        )

        forecast.append(
            {
                "time": timestamp.isoformat(),
                "predicted_arrivals": predicted,
                "lower_bound": lower,
                "upper_bound": upper,
            }
        )

    # Peak forecast
    peak_index = forecast_mean.idxmax()
    peak_arrivals = max(
        0,
        round(float(forecast_mean.loc[peak_index])),
    )

    # Latest hourly arrivals
    current_arrivals = int(hourly_arrivals.iloc[-1])

    return {
        "forecast": forecast,
        "peak_arrivals": peak_arrivals,
        "peak_time": peak_index.isoformat(),
        "current_arrivals": current_arrivals,
    }