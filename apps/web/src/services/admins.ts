import { apiRequest } from './api';

export type Admin = {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'read_only' | 'payroll' | 'compliance';
  is_active: boolean;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
};

export type CreateAdminPayload = {
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'read_only' | 'payroll' | 'compliance';
  password: string;
};

export type UpdateAdminPayload = {
  name?: string;
  role?: 'owner' | 'admin' | 'read_only' | 'payroll' | 'compliance';
  isActive?: boolean;
  mfaEnabled?: boolean;
};

export async function listAdmins(): Promise<Admin[]> {
  return apiRequest<Admin[]>('/api/v1/admin/admins');
}

export async function createAdmin(
  payload: CreateAdminPayload
): Promise<Admin> {
  return apiRequest<Admin>('/api/v1/admin/admins', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAdmin(
  id: string,
  payload: UpdateAdminPayload
): Promise<Admin> {
  return apiRequest<Admin>(`/api/v1/admin/admins/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdmin(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/admin/admins/${id}`, {
    method: 'DELETE'
  });
}
