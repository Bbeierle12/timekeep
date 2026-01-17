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

  return apiRequest<Employee[]>(url, { token });
}

export async function getEmployee(id: string, token: string): Promise<Employee> {
  return apiRequest<Employee>(`/api/admin/employees/${id}`, { token });
}

export async function createEmployee(
  payload: CreateEmployeePayload,
  token: string
): Promise<Employee> {
  return apiRequest<Employee>('/api/admin/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
    token
  });
}

export async function updateEmployee(
  id: string,
  payload: UpdateEmployeePayload,
  token: string
): Promise<Employee> {
  return apiRequest<Employee>(`/api/admin/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    token
  });
}

export async function deactivateEmployee(id: string, token: string): Promise<Employee> {
  return apiRequest<Employee>(`/api/admin/employees/${id}/deactivate`, {
    method: 'POST',
    token
  });
}

export async function reactivateEmployee(id: string, token: string): Promise<Employee> {
  return apiRequest<Employee>(`/api/admin/employees/${id}/reactivate`, {
    method: 'POST',
    token
  });
}

export async function resetEmployeePin(
  id: string,
  pin: string,
  token: string
): Promise<Employee> {
  return apiRequest<Employee>(`/api/admin/employees/${id}/reset-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
    token
  });
}

// Import Types and Functions
export type ImportResult = {
  success: boolean;
  row: number;
  initials: string;
  error?: string;
};

export type ImportSummary = {
  importId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  results: ImportResult[];
};

export type ImportHistory = {
  id: string;
  filename: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at: string | null;
};

export async function importEmployees(
  filename: string,
  csvContent: string,
  token: string
): Promise<ImportSummary> {
  return apiRequest<ImportSummary>('/api/admin/employees/import', {
    method: 'POST',
    body: JSON.stringify({ filename, csvContent }),
    token
  });
}

export async function getImportHistory(token: string, limit = 20): Promise<ImportHistory[]> {
  return apiRequest<ImportHistory[]>(`/api/admin/employees/import/history?limit=${limit}`, {
    token
  });
}

export async function getImportDetails(importId: string, token: string): Promise<ImportHistory & { error_details: unknown }> {
  return apiRequest<ImportHistory & { error_details: unknown }>(`/api/admin/employees/import/${importId}`, {
    token
  });
}
