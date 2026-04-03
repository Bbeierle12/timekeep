import { apiRequest } from './api';
import type { User } from '../context/AuthContext';

export type LoginResponse = {
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
  return apiRequest<LoginResponse>('/api/v1/auth/employee/login', {
    method: 'POST',
    body: JSON.stringify({ initials, pin })
  });
}

export type MfaChallengeResponse = {
  mfaRequired: true;
  mfaChallengeToken: string;
};

export type AdminLoginResponse = LoginResponse | MfaChallengeResponse;

function isMfaChallenge(data: AdminLoginResponse): data is MfaChallengeResponse {
  return 'mfaRequired' in data && data.mfaRequired === true;
}

export async function loginAdmin(email: string, password: string): Promise<AdminLoginResponse> {
  return apiRequest<AdminLoginResponse>('/api/v1/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function verifyMfa(params: {
  challengeToken: string;
  totpCode?: string;
  recoveryCode?: string;
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/v1/auth/admin/login/mfa', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export { isMfaChallenge };

export async function logout(): Promise<void> {
  await apiRequest('/api/v1/auth/logout', {
    method: 'POST'
  });
}

export async function changePin(
  currentPin: string,
  newPin: string
): Promise<void> {
  await apiRequest('/api/v1/auth/employee/change-pin', {
    method: 'POST',
    body: JSON.stringify({ currentPin, newPin })
  });
}

export async function getSession(): Promise<{ user: LoginResponse['user'] }> {
  return apiRequest<{ user: LoginResponse['user'] }>('/api/v1/auth/session');
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
  return apiRequest<ForgotPasswordResponse>('/api/v1/auth/admin/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function validateResetToken(token: string): Promise<ValidateTokenResponse> {
  return apiRequest<ValidateTokenResponse>('/api/v1/auth/admin/validate-reset-token', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/v1/auth/admin/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword })
  });
}
