import { apiClient } from './client';

export const getDashboardSummary = () => apiClient('/events/summary');
export const getRecentEvents = (limit = 10) => apiClient(`/events?limit=${limit}`);
export const getVisitTriage = (visitId) => apiClient(`/telemetry/triage/${visitId}`);
export const getEquipmentList = () => apiClient('/telemetry/equipment');