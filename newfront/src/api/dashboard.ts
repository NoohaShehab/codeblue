export type HospitalSummary = {
  total_beds: number;
  occupied_beds: number;
  bed_occupancy_rate: number;
  total_patients: number;
  active_visits: number;
  critical_events_count: number;
};

export type DashboardVisit = {
  visit_id: number;
  patient_id: number;
  visit_start_time: string;
  visit_end_time: string | null;
  status: string;
};

export type DashboardBed = {
  bed_id: number;
  department_id: number;
  bed_number: string;
  bed_type: string;
  status: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8001/api";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Dashboard API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getHospitalSummary(): Promise<HospitalSummary> {
  return getJson<HospitalSummary>("/events/summary");
}

export function getDashboardVisits(): Promise<DashboardVisit[]> {
  return getJson<DashboardVisit[]>("/visits");
}

export function getDashboardBeds(): Promise<DashboardBed[]> {
  return getJson<DashboardBed[]>("/beds");
}
