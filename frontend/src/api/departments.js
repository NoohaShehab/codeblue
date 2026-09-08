import { apiClient } from './client';

export const getDepartments = () => apiClient('/departments');
export const getDepartmentStaff = (deptId) => apiClient(`/departments/${deptId}/staff`);
export const getBeds = (deptId) => apiClient(deptId ? `/beds?department_id=${deptId}` : '/beds');