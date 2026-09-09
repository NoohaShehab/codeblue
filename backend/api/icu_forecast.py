import pandas as pd

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

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

    Returns:
    - total ICU beds
    - currently occupied ICU beds
    - current occupancy %
    - peak forecast
    - hourly forecast
    """

    # =========================================================
    # 1. Get ICU beds
    # =========================================================

    icu_beds = (
        db.query(Bed)
        .filter(Bed.bed_type.ilike("ICU"))
        .all()
    )

    if not icu_beds:
        raise HTTPException(
            status_code=404,
            detail="No ICU beds found.",
        )

    icu_bed_ids = {
        bed.bed_id
        for bed in icu_beds
    }

    total_icu_beds = len(icu_bed_ids)

    # =========================================================
    # 2. Get ONLY ICU assignments
    # =========================================================

    assignments = (
        db.query(BedAssignment)
        .filter(
            BedAssignment.bed_id.in_(icu_bed_ids)
        )
        .all()
    )

    if not assignments:
        raise HTTPException(
            status_code=404,
            detail="No ICU bed assignment data available.",
        )

    # =========================================================
    # 3. Build DataFrame
    # =========================================================

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

    df = df.dropna(
        subset=["start_time"]
    )

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail=(
                "No valid ICU assignment timestamps "
                "available."
            ),
        )

    # =========================================================
    # 4. Find latest ICU timestamp
    #
    # IMPORTANT:
    # Do NOT use assignments from other departments.
    # =========================================================

    max_start = df["start_time"].max()

    valid_end_times = df["end_time"].dropna()

    if not valid_end_times.empty:
        max_end = valid_end_times.max()
        max_time = max(max_start, max_end)
    else:
        max_time = max_start

    # =========================================================
    # 5. Handle active assignments
    #
    # An assignment with NULL end_time is considered active
    # until the latest known ICU timestamp.
    # =========================================================

    df["end_time"] = df["end_time"].fillna(
        max_time
    )

    # =========================================================
    # 6. Create hourly timeline
    # =========================================================

    start = df["start_time"].min().floor("h")
    end = max_time.floor("h")

    if end <= start:
        raise HTTPException(
            status_code=400,
            detail=(
                "Insufficient ICU assignment "
                "history."
            ),
        )

    hourly_time = pd.date_range(
        start=start,
        end=end,
        freq="h",
    )

    # =========================================================
    # 7. Calculate UNIQUE occupied ICU beds
    #
    # This is the important fix.
    #
    # We count unique bed_id instead of assignment rows.
    # =========================================================

    occupied_counts = []

    for timestamp in hourly_time:

        active_assignments = df[
            (df["start_time"] <= timestamp)
            & (df["end_time"] > timestamp)
        ]

        occupied_beds = (
            active_assignments["bed_id"]
            .dropna()
            .nunique()
        )

        # Never allow occupancy to exceed capacity.
        occupied_beds = min(
            occupied_beds,
            total_icu_beds,
        )

        occupied_counts.append(
            occupied_beds
        )

    # =========================================================
    # 8. Build occupancy dataframe
    # =========================================================

    icu_occupancy = pd.DataFrame(
        {
            "timestamp": hourly_time,
            "occupied_beds": occupied_counts,
        }
    )

    icu_occupancy["occupancy_pct"] = (
        icu_occupancy["occupied_beds"]
        / total_icu_beds
    ) * 100

    # Safety clamp
    icu_occupancy["occupancy_pct"] = (
        icu_occupancy["occupancy_pct"]
        .clip(0, 100)
    )

    # =========================================================
    # 9. Need enough history for Prophet
    # =========================================================

    if len(icu_occupancy) < 48:
        raise HTTPException(
            status_code=400,
            detail=(
                "Insufficient historical ICU occupancy "
                "data for forecasting. At least 48 hours "
                "are required."
            ),
        )

    # =========================================================
    # 10. Prepare Prophet data
    # =========================================================

    prophet_df = (
        icu_occupancy[
            [
                "timestamp",
                "occupancy_pct",
            ]
        ]
        .rename(
            columns={
                "timestamp": "ds",
                "occupancy_pct": "y",
            }
        )
    )

    # =========================================================
    # 11. Train Prophet
    # =========================================================

    model = Prophet(
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=False,
    )

    try:

        model.fit(prophet_df)

        future = model.make_future_dataframe(
            periods=hours,
            freq="h",
        )

        forecast_result = (
            model.predict(future)
            .tail(hours)
            .copy()
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"ICU forecasting failed: {str(e)}",
        )

    # =========================================================
    # 12. Build forecast response
    # =========================================================

    forecast = []

    for _, row in forecast_result.iterrows():

        timestamp = row["ds"]

        predicted = max(
            0,
            min(
                100,
                round(
                    float(row["yhat"]),
                    2,
                ),
            ),
        )

        lower = max(
            0,
            min(
                100,
                round(
                    float(row["yhat_lower"]),
                    2,
                ),
            ),
        )

        upper = max(
            predicted,
            min(
                100,
                round(
                    float(row["yhat_upper"]),
                    2,
                ),
            ),
        )

        predicted_occupied_beds = (
            predicted / 100
        ) * total_icu_beds

        buffer_beds = max(
            total_icu_beds
            - predicted_occupied_beds,
            0,
        )

        forecast.append(
            {
                "timestamp": timestamp.isoformat(),

                "forecast_occupancy": predicted,

                "lower_bound": lower,

                "upper_bound": upper,

                "predicted_occupied_beds": round(
                    predicted_occupied_beds,
                    2,
                ),

                "buffer_beds": round(
                    buffer_beds,
                    2,
                ),
            }
        )

    # =========================================================
    # 13. Peak forecast
    # =========================================================

    peak_item = max(
        forecast,
        key=lambda x: x["forecast_occupancy"],
    )

    # =========================================================
    # 14. Current ICU status
    #
    # Last historical point.
    # =========================================================

    current_occupancy = float(
        icu_occupancy[
            "occupancy_pct"
        ].iloc[-1]
    )

    current_occupied_beds = int(
        icu_occupancy[
            "occupied_beds"
        ].iloc[-1]
    )

    # Safety protection
    current_occupied_beds = min(
        current_occupied_beds,
        total_icu_beds,
    )

    current_occupancy = min(
        current_occupancy,
        100,
    )

    # =========================================================
    # 15. Available beds
    # =========================================================

    available_beds = max(
        total_icu_beds
        - current_occupied_beds,
        0,
    )

    # =========================================================
    # 16. Final response
    # =========================================================

    return {
        "total_icu_beds": total_icu_beds,

        "current_occupancy": round(
            current_occupancy,
            2,
        ),

        "current_occupied_beds":
            current_occupied_beds,

        "available_beds":
            available_beds,

        "peak_occupancy":
            peak_item["forecast_occupancy"],

        "peak_time":
            peak_item["timestamp"],

        "forecast":
            forecast,
    }