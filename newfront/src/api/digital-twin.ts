export type DigitalTwinBed = {
  bed_id: number;
  bed_number: string;
  department_id: number;
  department_name: string;
  bed_type: string;
  status: 'occupied' | 'ready' | 'cleaning' | 'blocked' | string;
};

export type DigitalTwinDepartment = {
  department_id: number;
  name: string;
  occupancy: number;
  available: number;
  admissions_transit: number;
  pending_transfers: number;
  discharges_planned: number;
};

export type DigitalTwinResponse = {
  beds: DigitalTwinBed[];
  summary: {
    occupied: number;
    ready: number;
    cleaning: number;
    blocked: number;
  };
  departments: Record<string, DigitalTwinDepartment>;
  last_updated: string | null;
};

export type DigitalTwinBedDetails = {
  bed: DigitalTwinBed;
  patient: {
    patient_id: number;
    age: number | null;
    gender: string | null;
    severity: string | null;
  } | null;
  visit: {
    visit_id: number;
    arrival_time: string | null;
    admission_time: string | null;
    status: string | null;
  } | null;
  notes: Array<{
    note_id: number;
    timestamp: string | null;
    note_type: string | null;
    note_text: string | null;
  }>;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001/api';

export async function getDigitalTwin(): Promise<DigitalTwinResponse> {
  const response = await fetch(`${API_BASE_URL}/digital-twin`);
  if (!response.ok) {
    throw new Error(`Digital Twin API request failed (${response.status})`);
  }
  return response.json() as Promise<DigitalTwinResponse>;
}

export async function getDigitalTwinBedDetails(
  bedId: number,
): Promise<DigitalTwinBedDetails> {
  const response = await fetch(`${API_BASE_URL}/digital-twin/beds/${bedId}`);
  if (!response.ok) {
    throw new Error(`Bed details request failed (${response.status})`);
  }
  return response.json() as Promise<DigitalTwinBedDetails>;
}
