import { apiRequest } from './api';

export function exportPayroll() {
  return apiRequest('/api/admin/reports/payroll');
}
