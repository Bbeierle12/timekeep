import { apiRequest } from './api';
import type { User } from '../context/AuthContext';

export type LoginResponse = {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    type: 'ADMIN' | 'EMPLOYEE';
    name: string;
    initials?: string;
    role?: string;
  };
  pendingCertification?: {
    workDate: string;
    entries: Array<{
      id: string;
      work_date: string;
      action_type: string;
      recorded_at: string;
      comment: string | null;
      resolved_address: string | null;
    }>;
    summary: unknown;
  } | null;
};

export async function loginEmployee(initials: string, pin: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/employee/login', {
    method: 'POST',
    body: JSON.stringify({ initials, pin })
  });
}

export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function logout(token: string): Promise<void> {
  await apiRequest('/api/auth/logout', {
    method: 'POST',
    token
  });
}

export async function changePin(
  currentPin: string,
  newPin: string,
  token: string
): Promise<void> {
  await apiRequest('/api/auth/employee/change-pin', {
    method: 'POST',
    body: JSON.stringify({ currentPin, newPin }),
    token
  });
}

// Convert API response user to our User type
export function toUser(apiUser: LoginResponse['user']): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    type: apiUser.type,
    initials: apiUser.initials,
    role: apiUser.role
  };
}

// Password Reset Functions
export type ForgotPasswordResponse = {
  message: string;
  token?: string; // Only in development
};

export type ValidateTokenResponse = {
  valid: boolean;
};

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>('/api/auth/admin/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function validateResetToken(token: string): Promise<ValidateTokenResponse> {
  return apiRequest<ValidateTokenResponse>('/api/auth/admin/validate-reset-token', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/auth/admin/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword })
  });
}
