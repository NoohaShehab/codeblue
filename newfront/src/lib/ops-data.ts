export type Severity = 'critical' | 'watch' | 'stable';
export type Range = '6h' | '12h' | '24h' | '7d';

export type HospitalKpis = {
  totalPatients: number; occupiedBeds: number; availableBeds: number; occupancy: number; erPressure: number; icuOccupancy: number;
};
export type DepartmentStatus = { id: string; name: string; status: Severity; occupancy: number; capacity: number; availableBeds: number; trend: number; };
export type ForecastPoint = { timestamp: string; actual: number | null; forecast: number; lowerBound: number; upperBound: number; };
export type Insight = { id: string; severity: Severity; title: string; summary: string; why: string; impact: string; action: string; area: string; };
export type CoordinationState = { situation: string; priorities: string[]; recommendation: string; reasoning: string[]; };
export type SimulationScenario = { erArrivalDelta: number; icuBedReduction: number; icuAdmissionDelta: number; delayedDischarges: number; };
export type SimulationResult = { erPressure: number; icuOccupancy: number; availableBeds: number; waitTimeDelta: number; recommendation: string; };

export const kpis: HospitalKpis = { totalPatients: 418, occupiedBeds: 371, availableBeds: 47, occupancy: 88.8, erPressure: 74, icuOccupancy: 92.4 };

export const departments: DepartmentStatus[] = [
  { id: 'er', name: 'Emergency', status: 'critical', occupancy: 94, capacity: 52, availableBeds: 3, trend: 8 },
  { id: 'icu', name: 'ICU', status: 'watch', occupancy: 92, capacity: 36, availableBeds: 3, trend: 4 },
  { id: 'med', name: 'Medicine', status: 'watch', occupancy: 91, capacity: 118, availableBeds: 11, trend: 3 },
  { id: 'surg', name: 'Surgery', status: 'stable', occupancy: 83, capacity: 96, availableBeds: 16, trend: -2 },
  { id: 'peds', name: 'Pediatrics', status: 'stable', occupancy: 76, capacity: 42, availableBeds: 10, trend: -1 },
  { id: 'womens', name: "Women's Health", status: 'stable', occupancy: 81, capacity: 54, availableBeds: 10, trend: 1 },
];

const timeLabels = ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00','00:00','02:00','04:00'];
export const erForecast: ForecastPoint[] = timeLabels.map((timestamp, i) => ({ timestamp, actual: i < 7 ? [49,54,61,70,67,72,78][i] : null, forecast: [49,54,61,70,67,72,78,80,76,69,62,57][i], lowerBound: [44,48,53,62,59,64,69,71,67,61,55,50][i], upperBound: [54,60,68,78,75,80,87,90,86,78,70,65][i] }));
export const icuForecast: ForecastPoint[] = timeLabels.map((timestamp, i) => ({ timestamp, actual: i < 7 ? [84,86,88,89,91,92,92][i] : null, forecast: [84,86,88,89,91,92,92,93,94,93,92,91][i], lowerBound: [81,83,85,86,88,89,89,90,91,90,89,88][i], upperBound: [87,89,91,92,94,95,95,96,97,96,95,94][i] }));

export const insights: Insight[] = [
  { id: 'i1', severity: 'critical', area: 'Emergency', title: 'ER boarding time is above operating threshold', summary: '12 admitted patients are waiting for an inpatient bed. Median boarding time is 3h 18m.', why: 'Medicine occupancy reached 91% after a higher-than-expected respiratory admission block this morning.', impact: 'If unchanged, ER wait time is likely to exceed 58 minutes by 18:00.', action: 'Prioritize 4 Medicine discharges and open the flex observation pod by 16:00.' },
  { id: 'i2', severity: 'watch', area: 'ICU', title: 'ICU capacity tightening over next 12 hours', summary: 'Three beds are available now; forecast occupancy peaks at 94% overnight.', why: 'Two transfers from Surgery are clinically ready and one expected admission is already in transit.', impact: 'A delayed discharge would remove the only safe buffer for overnight demand.', action: 'Confirm step-down placement for two patients before 17:30.' },
  { id: 'i3', severity: 'watch', area: 'Medicine', title: 'Discharge pace is 2 patients behind plan', summary: '7 of 9 planned discharges are complete at 14:20.', why: 'Pharmacy reconciliation is pending on two patients in the east pod.', impact: 'Bed turnover is delayed at the same time as ER demand is rising.', action: 'Escalate pharmacy reconciliation and target completion by 15:30.' },
  { id: 'i4', severity: 'stable', area: 'Surgery', title: 'Operating room schedule has regained buffer', summary: 'Two elective cases moved to tomorrow, releasing 3 beds this afternoon.', why: 'The perioperative team adjusted sequencing after a shorter trauma list.', impact: 'Bed availability improves for evening transfers.', action: 'Offer one released bed to the ICU step-down queue.' },
];

export const coordination: CoordinationState = {
  situation: 'The hospital is operating close to full capacity with the highest pressure concentrated in Emergency and ICU. The next 6 hours are manageable if planned discharges convert on time.',
  priorities: ['Create 4 Medicine beds before 16:00', 'Protect 2 ICU step-down beds', 'Reduce ER boarding before evening arrival peak'],
  recommendation: 'Activate the 4-bed observation flex pod and run a coordinated discharge huddle across Medicine, Pharmacy, and Case Management.',
  reasoning: ['ER arrivals are trending 8% above the expected afternoon curve.', 'Medicine has 11 beds nominally available, but 4 are blocked by discharge workflow.', 'ICU has only a 3-bed operational buffer against the overnight forecast.'],
};

export const defaultScenario: SimulationScenario = { erArrivalDelta: 0, icuBedReduction: 0, icuAdmissionDelta: 0, delayedDischarges: 0 };

export function runSimulation(s: SimulationScenario): SimulationResult {
  const erPressure = Math.min(99, Math.round(74 + s.erArrivalDelta * 0.7 + s.delayedDischarges * 2.2));
  const icuOccupancy = Math.min(99, +(92.4 + s.icuBedReduction * 1.8 + s.icuAdmissionDelta * 1.4 + s.delayedDischarges * 0.7).toFixed(1));
  const availableBeds = Math.max(0, Math.round(47 - s.icuBedReduction - s.icuAdmissionDelta - s.delayedDischarges * 2));
  const waitTimeDelta = Math.round(s.erArrivalDelta * 0.45 + s.delayedDischarges * 3);
  return { erPressure, icuOccupancy, availableBeds, waitTimeDelta, recommendation: erPressure > 85 || icuOccupancy > 95 ? 'Escalate to the capacity command group and open the surge protocol.' : 'Proceed with the current coordination plan and verify discharges at the next huddle.' };
}