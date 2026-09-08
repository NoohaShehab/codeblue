import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from statsmodels.tsa.statespace.sarimax import SARIMAX
from prophet import Prophet

from database import get_db
from models import Bed, BedAssignment


router = APIRouter(
    prefix="/api/icu-forecast",
    tags=["ICU Forecast"],
)


@router.get("")
def forecast_icu_occupancy(
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    """
    Forecast ICU bed occupancy for the next N hours.
    """

    # Get ICU beds
    icu_beds = (
        db.query(Bed)
        .filter(Bed.bed_type == "ICU")
        .all()
    )

    if not icu_beds:
        raise HTTPException(
            status_code=404,
            detail="No ICU beds found.",
        )

    icu_bed_ids = [bed.bed_id for bed in icu_beds]
    total_icu_beds = len(icu_bed_ids)

    # Get ICU bed assignments
    assignments = (
        db.query(BedAssignment)
        .filter(BedAssignment.bed_id.in_(icu_bed_ids))
        .all()
    )

    if not assignments:
        raise HTTPException(
            status_code=404,
            detail="No ICU bed assignment data available.",
        )

    # Convert assignments to DataFrame
    data = [
        {
            "bed_id": assignment.bed_id,
            "start_time": assignment.start_time,
            "end_time": assignment.end_time,
        }
        for assignment in assignments
    ]

    df = pd.DataFrame(data)

    df["start_time"] = pd.to_datetime(
        df["start_time"],
        errors="coerce",
    )

    df["end_time"] = pd.to_datetime(
        df["end_time"],
        errors="coerce",
    )

    df = df.dropna(subset=["start_time"])

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="No valid ICU assignment timestamps available.",
        )

    # Use latest known time for active assignments
    all_assignments = (
        db.query(BedAssignment.start_time, BedAssignment.end_time)
        .all()
    )

    all_start_times = pd.to_datetime(
        [row.start_time for row in all_assignments],
        errors="coerce"
    )

    all_end_times = pd.to_datetime(
        [row.end_time for row in all_assignments],
        errors="coerce"
    )

    max_time = max(
        all_start_times.max(),
        all_end_times.max()
    )

    df["end_time"] = df["end_time"].fillna(max_time)

    # Create hourly timeline
    start = df["start_time"].min().floor("h")
    end = max_time.floor("h")

    hourly_time = pd.date_range(
        start=start,
        end=end,
        freq="h",
    )

    # Calculate occupied ICU beds for every hour
    occupied_counts = []

    for timestamp in hourly_time:
        occupied = (
            (df["start_time"] <= timestamp)
            & (df["end_time"] > timestamp)
        ).sum()

        occupied_counts.append(occupied)

    icu_occupancy = pd.DataFrame(
        {
            "timestamp": hourly_time,
            "occupied_beds": occupied_counts,
        }
    )

    # Calculate occupancy percentage
    icu_occupancy["occupancy_pct"] = (
        icu_occupancy["occupied_beds"]
        / total_icu_beds
    ) * 100

    if len(icu_occupancy) < 48:
        raise HTTPException(
            status_code=400,
            detail=(
                "Insufficient historical ICU occupancy data "
                "for forecasting."
            ),
        )

    # Prepare time series
    ts = icu_occupancy[
        ["timestamp", "occupancy_pct"]
    ].copy()

    ts = ts.set_index("timestamp")

    # Prophet was used in the notebook,
    # but we will first reproduce the final forecast
    # structure using the same historical ICU occupancy data.
    #
    # SARIMAX is used here to avoid adding another backend
    # dependency while we verify the complete API pipeline.

    prophet_df = ts.reset_index()[["timestamp", "occupancy_pct"]].rename(
    columns={
        "timestamp": "ds",
        "occupancy_pct": "y",
    }
)

    model = Prophet(
    daily_seasonality=True,
    weekly_seasonality=True,
    yearly_seasonality=False,
)
    
    try:
        result = model.fit(prophet_df)

        future = result.make_future_dataframe(periods=hours, freq="h")
        forecast_result = result.predict(future).tail(hours)

        forecast_mean = forecast_result["yhat"]
        confidence_interval = forecast_result[["yhat_lower", "yhat_upper"]]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ICU forecasting failed: {str(e)}",
        )

    forecast = []

    forecast = []

    for i, row in forecast_result.iterrows():
        timestamp = row["ds"]

        predicted = max(
            0,
            min(100, round(float(row["yhat"]), 2)),
        )

        lower = max(
            0,
            min(100, round(float(row["yhat_lower"]), 2)),
        )

        upper = max(
            predicted,
            min(100, round(float(row["yhat_upper"]), 2)),
        )

        predicted_occupied_beds = (predicted / 100) * total_icu_beds
        buffer_beds = total_icu_beds - predicted_occupied_beds

        forecast.append(
            {
                "timestamp": timestamp.isoformat(),
                "forecast_occupancy": predicted,
                "lower_bound": lower,
                "upper_bound": upper,
                "predicted_occupied_beds": round(predicted_occupied_beds, 2),
                "buffer_beds": round(buffer_beds, 2),
            }
        )

    
    peak_item = max(
        forecast,
        key=lambda x: x["forecast_occupancy"],
    )

    current_occupancy = float(
        icu_occupancy["occupancy_pct"].iloc[-1]
    )

    current_occupied_beds = int(
        icu_occupancy["occupied_beds"].iloc[-1]
    )

    return {
        "total_icu_beds": total_icu_beds,
        "current_occupancy": round(
            current_occupancy,
            2,
        ),
        "current_occupied_beds": current_occupied_beds,
        "peak_occupancy": peak_item[
            "forecast_occupancy"
        ],
        "peak_time": peak_item[
            "timestamp"
        ],
        "forecast": forecast,
    }