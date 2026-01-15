import { apiRequest } from './api';

export function loginEmployee(initials: string, pin: string) {
  return apiRequest('/api/auth/employee/login', {
    method: 'POST',
    body: JSON.stringify({ initials, pin })
  });
}
