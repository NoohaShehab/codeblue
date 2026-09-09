
export type ERForecastItem = {
  time: string;
  predicted_arrivals: number;
  lower_bound: number;
  upper_bound: number;
};

export type ERForecastResponse = {
  forecast: ERForecastItem[];
  peak_arrivals: number;
  peak_time: string;
  current_arrivals: number;
};

export type ICUForecastItem = {
  timestamp: string;
  forecast_occupancy: number;
  lower_bound: number;
  upper_bound: number;
  predicted_occupied_beds: number;
  buffer_beds: number;
};

export type ICUForecastResponse = {
  total_icu_beds: number;
  current_occupancy: number;
  current_occupied_beds: number;
  available_beds: number;
  peak_occupancy: number;
  peak_time: string;
  forecast: {
    timestamp: string;
    forecast_occupancy: number;
    lower_bound: number;
    upper_bound: number;
    predicted_occupied_beds: number;
    buffer_beds: number;
  }[];
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8001/api";

export async function getERForecast(
  hours: number,
): Promise<ERForecastResponse> {
  const response = await fetch(
    `${API_BASE_URL}/forecast?hours=${hours}`,
  );

  if (!response.ok) {
    throw new Error(
      `ER Forecast API request failed (${response.status})`,
    );
  }

  return response.json() as Promise<ERForecastResponse>;
}

export async function getICUForecast(
  hours: number,
): Promise<ICUForecastResponse> {
  const response = await fetch(
    `${API_BASE_URL}/icu-forecast?hours=${hours}`,
  );

  if (!response.ok) {
    throw new Error(
      `ICU Forecast API request failed (${response.status})`,
    );
  }

  return response.json() as Promise<ICUForecastResponse>;
}

