import { apiRequest } from './api';

export function listEmployees() {
  return apiRequest('/api/admin/employees');
}
