import { apiClient } from './client';

export const getVisits = (status = 'active') => apiClient(`/visits?status=${status}`);
export const getVisitPatient = (visitId) => apiClient(`/visits/${visitId}/patient`);
export const getVisitNotes = (visitId) => apiClient(`/visits/${visitId}/notes`);
export const getVisitTransfers = (visitId) => apiClient(`/visits/${visitId}/transfers`);