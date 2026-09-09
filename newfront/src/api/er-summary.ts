
export type ERSummaryResponse = {
  current_arrivals: number;
  patients_waiting: number;
  waiting_over_60: number;
  median_wait_minutes: number;
  boarding: number;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8001/api";

export async function getERSummary(): Promise<ERSummaryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/er-summary`,
  );

  if (!response.ok) {
    throw new Error(
      `ER Summary API request failed (${response.status})`,
    );
  }

  return response.json() as Promise<ERSummaryResponse>;
}

