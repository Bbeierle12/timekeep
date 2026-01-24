import { apiRequest, type PagedResponse } from './api';

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
  limit?: number;
  offset?: number;
};

export async function listEmployees(
  params: ListEmployeesParams
): Promise<PagedResponse<Employee>> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  const url = `/api/v1/admin/employees${query ? `?${query}` : ''}`;

  return apiRequest<PagedResponse<Employee>>(url);
}

export async function getEmployee(id: string): Promise<Employee> {
  return apiRequest<Employee>(`/api/v1/admin/employees/${id}`);
}

export async function createEmployee(
  payload: CreateEmployeePayload
): Promise<Employee> {
  return apiRequest<Employee>('/api/v1/admin/employees', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateEmployee(
  id: string,
  payload: UpdateEmployeePayload
): Promise<Employee> {
  return apiRequest<Employee>(`/api/v1/admin/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deactivateEmployee(id: string): Promise<Employee> {
  return apiRequest<Employee>(`/api/v1/admin/employees/${id}/deactivate`, {
    method: 'POST'
  });
}

export async function reactivateEmployee(id: string): Promise<Employee> {
  return apiRequest<Employee>(`/api/v1/admin/employees/${id}/reactivate`, {
    method: 'POST'
  });
}

export async function resetEmployeePin(
  id: string,
  pin: string
): Promise<Employee> {
  return apiRequest<Employee>(`/api/v1/admin/employees/${id}/reset-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin })
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
  csvContent: string
): Promise<ImportSummary> {
  return apiRequest<ImportSummary>('/api/v1/admin/employees/import', {
    method: 'POST',
    body: JSON.stringify({ filename, csvContent })
  });
}

export async function getImportHistory(limit = 20): Promise<ImportHistory[]> {
  return apiRequest<ImportHistory[]>(`/api/v1/admin/employees/import/history?limit=${limit}`);
}

export async function getImportDetails(importId: string): Promise<ImportHistory & { error_details: unknown }> {
  return apiRequest<ImportHistory & { error_details: unknown }>(`/api/v1/admin/employees/import/${importId}`);
}
