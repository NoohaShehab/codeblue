export type ERQueueItem = {
  visit_id: number;
  patient_id: number;
  patient_label: string;
  arrival_time: string;
  current_status: string;
  triage_level: number | null;
  triage_priority: string | null;
  waiting_minutes: number;
};

export type ERQueueResponse = {
  as_of: string | null;
  patients: ERQueueItem[];
};

export type ERMetricsResponse = {
  as_of: string | null;
  total_active_patients: number;
  patients_waiting_for_assessment: number;
  average_wait_minutes: number;
  longest_wait_minutes: number;
  longest_waiting_patient_id: number | null;
  patients_in_assessment: number;
  patients_in_treatment: number;
  patients_waiting_for_icu: number;
  flow: Record<string, number>;
};

export type ERBottleneck = {
  bottleneck_type: string;
  severity: string;
  affected_patient_count: number;
  average_wait_minutes: number;
  explanation: string;
};

export type ERBottleneckResponse = {
  as_of: string | null;
  bottlenecks: ERBottleneck[];
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8001/api";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`ER Operations API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getERQueue(): Promise<ERQueueResponse> {
  return getJson<ERQueueResponse>("/er/queue");
}

export function getERMetrics(): Promise<ERMetricsResponse> {
  return getJson<ERMetricsResponse>("/er/metrics");
}

export function getERBottlenecks(): Promise<ERBottleneckResponse> {
  return getJson<ERBottleneckResponse>("/er/bottlenecks");
}
