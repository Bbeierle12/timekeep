import { apiRequest } from './api';

export function fetchToday() {
  return apiRequest('/api/today');
}
