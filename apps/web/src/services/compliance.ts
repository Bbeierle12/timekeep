import { apiRequest } from './api';

export function fetchComplianceDashboard() {
  return apiRequest('/api/admin/compliance/dashboard');
}
