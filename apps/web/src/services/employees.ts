import { apiRequest } from './api';

export type Employee = {
  id: string;
  initials: string;
  full_name: string;
  is_active: boolean;
  is_exempt: boolean;
  email: string | null;
  phone_number: string | null;
  hire_date: string | null;
  hourly_rate: number | null;
  notes: string | null;
  site_id: string | null;
  created_at: string;
  deactivated_at: string | null;
  deactivated_by: string | null;
};

export type CreateEmployeePayload = {
  initials: string;
  fullName: string;
  isExempt?: boolean;
  pin?: string;
  email?: string | null;
  phoneNumber?: string | null;
  hireDate?: string | null;
  hourlyRate?: number | null;
  notes?: string | null;
  siteId?: string | null;
};

export type UpdateEmployeePayload = {
  initials?: string;
  fullName?: string;
  isExempt?: boolean;
  email?: string | null;
  phoneNumber?: string | null;
  hireDate?: string | null;
  hourlyRate?: number | null;
  notes?: string | null;
  siteId?: string | null;
  isActive?: boolean;
};

export type ListEmployeesParams = {
  status?: 'active' | 'inactive' | 'all';
  search?: string;
};

export async function listEmployees(
  params: ListEmployeesParams,
  token: string
): Promise<Employee[]> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const url = `/api/admin/employees${query ? `?${query}` : ''}`;

  const response = await apiRequest<{ status: string; data: Employee[] }>(url, { token });
  return response.data;
}

export async function getEmployee(id: string, token: string): Promise<Employee> {
  const response = await apiRequest<{ status: string; data: Employee }>(
    `/api/admin/employees/${id}`,
    { token }
  );
  return response.data;
}

export async function createEmployee(
  payload: CreateEmployeePayload,
  token: string
): Promise<Employee> {
  const response = await apiRequest<{ status: string; data: Employee }>(
    '/api/admin/employees',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      token
    }
  );
  return response.data;
}

export async function updateEmployee(
  id: string,
  payload: UpdateEmployeePayload,
  token: string
): Promise<Employee> {
  const response = await apiRequest<{ status: string; data: Employee }>(
    `/api/admin/employees/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
      token
    }
  );
  return response.data;
}

export async function deactivateEmployee(id: string, token: string): Promise<Employee> {
  const response = await apiRequest<{ status: string; data: Employee }>(
    `/api/admin/employees/${id}/deactivate`,
    {
      method: 'POST',
      token
    }
  );
  return response.data;
}

export async function reactivateEmployee(id: string, token: string): Promise<Employee> {
  const response = await apiRequest<{ status: string; data: Employee }>(
    `/api/admin/employees/${id}/reactivate`,
    {
      method: 'POST',
      token
    }
  );
  return response.data;
}

export async function resetEmployeePin(
  id: string,
  pin: string,
  token: string
): Promise<Employee> {
  const response = await apiRequest<{ status: string; data: Employee }>(
    `/api/admin/employees/${id}/reset-pin`,
    {
      method: 'POST',
      body: JSON.stringify({ pin }),
      token
    }
  );
  return response.data;
}
