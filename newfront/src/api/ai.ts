export type AIQueryResponse = {
  query: string;
  routed_to: string | null;
  agent: string | null;
  answer: string | null;
  routing_decision: { route?: string; reason?: string } | null;
};

export type SimulationScenario = {
  er_arrivals_change: number;
  icu_beds_unavailable: number;
  additional_icu_admissions: number;
  delayed_discharges: number;
};

export type SimulationResponse = {
  disclaimer: string;
  scenario_metrics: {
    er_pressure: number;
    icu_occupancy_percent: number;
    available_beds: number;
  };
  changes: {
    er_pressure: number;
    icu_occupancy_percent: number;
    available_beds: number;
    wait_time_index: number;
  };
  warnings: string[];
  answer: string | null;
};

export async function askAI(query: string): Promise<AIQueryResponse> {
  const response = await fetch('/api/ai/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? 'The AI service could not answer this question.');
  }

  return response.json() as Promise<AIQueryResponse>;
}

export async function simulateAI(scenario: SimulationScenario): Promise<SimulationResponse> {
  const response = await fetch('/api/ai/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? 'The simulation service could not run this scenario.');
  }

  return response.json() as Promise<SimulationResponse>;
}