import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:4000';

// Test data
export const mockEmployee = {
  id: 'emp-1',
  initials: 'JD',
  full_name: 'John Doe',
  is_active: true,
  access_status: 'APPROVED',
};

export const mockAdmin = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'SUPER_ADMIN',
  is_active: true,
};

export const mockTimeEntries = [
  {
    id: 'entry-1',
    employee_id: 'emp-1',
    work_date: '2024-01-15',
    action_type: 'CLOCK_IN',
    recorded_at: '2024-01-15T08:00:00Z',
    comment: null,
    resolved_address: '123 Main St, City, ST 12345',
  },
  {
    id: 'entry-2',
    employee_id: 'emp-1',
    work_date: '2024-01-15',
    action_type: 'LUNCH_START',
    recorded_at: '2024-01-15T12:00:00Z',
    comment: null,
    resolved_address: '123 Main St, City, ST 12345',
  },
];

export const mockComplianceStats = {
  today: {
    clockedIn: 5,
    onLunch: 2,
    onBreak: 1,
    clockedOut: 3,
  },
  week: {
    totalHours: 180,
    overtimeHours: 10,
    lunchViolations: 2,
    breakViolations: 1,
  },
  alerts: [
    {
      id: 'alert-1',
      type: 'LUNCH_VIOLATION',
      employee_id: 'emp-1',
      employee_name: 'John Doe',
      message: 'Late lunch start',
      created_at: '2024-01-15T14:00:00Z',
      is_resolved: false,
    },
  ],
};

export const handlers = [
  http.get(`${API_URL}/api/v1/csrf-token`, () => {
    return HttpResponse.json({ csrfToken: 'mock-csrf-token' });
  }),

  // Auth endpoints
  http.post(`${API_URL}/api/v1/auth/employee/login`, async ({ request }) => {
    const body = await request.json() as { initials: string; pin: string };

    if (body.initials === 'JD' && body.pin === '1234') {
      return HttpResponse.json({
        status: 'success',
        data: {
          ok: true,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          user: {
            id: mockEmployee.id,
            type: 'EMPLOYEE',
            name: mockEmployee.full_name,
            initials: mockEmployee.initials,
          },
          pendingCertification: null,
        },
      });
    }

    return HttpResponse.json(
      { status: 'error', message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/api/v1/auth/admin/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'admin@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        status: 'success',
        data: {
          ok: true,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          user: {
            id: mockAdmin.id,
            type: 'ADMIN',
            name: mockAdmin.name,
            role: mockAdmin.role,
          },
        },
      });
    }

    return HttpResponse.json(
      { status: 'error', message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/api/v1/auth/logout`, () => {
    return HttpResponse.json({ status: 'success' });
  }),

  http.post(`${API_URL}/api/v1/auth/refresh`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        ok: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        user: {
          id: mockEmployee.id,
          type: 'EMPLOYEE',
          name: mockEmployee.full_name,
          initials: mockEmployee.initials,
        },
      },
    });
  }),

  http.get(`${API_URL}/api/v1/auth/session`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        user: {
          id: mockEmployee.id,
          type: 'EMPLOYEE',
          name: mockEmployee.full_name,
          initials: mockEmployee.initials,
        },
      },
    });
  }),

  // CCPA consent endpoints
  http.get(`${API_URL}/api/v1/consent/location`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        hasConsented: false,
        consentedAt: null,
        consentVersion: null,
        requiresReconsent: true,
      },
    });
  }),

  http.post(`${API_URL}/api/v1/consent/location`, async () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        success: true,
        consentedAt: new Date().toISOString(),
      },
    });
  }),

  // Punch endpoints
  http.post(`${API_URL}/api/v1/punches`, async ({ request }) => {
    const body = await request.json() as { actionType: string };

    return HttpResponse.json({
      status: 'success',
      data: {
        id: `entry-${Date.now()}`,
        employee_id: 'emp-1',
        work_date: new Date().toISOString().split('T')[0],
        action_type: body.actionType,
        recorded_at: new Date().toISOString(),
        comment: null,
        resolved_address: '123 Main St, City, ST 12345',
      },
    });
  }),

  http.get(`${API_URL}/api/v1/punches`, ({ request }) => {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');

    const entries = date
      ? mockTimeEntries.filter((e) => e.work_date === date)
      : mockTimeEntries;

    return HttpResponse.json({
      status: 'success',
      data: entries,
    });
  }),

  http.get(`${API_URL}/api/v1/punches/history`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');

    return HttpResponse.json({
      status: 'success',
      data: {
        entries: mockTimeEntries,
        hasMore: page < 2,
      },
    });
  }),

  // Employee endpoints
  http.get(`${API_URL}/api/v1/admin/employees`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        items: [mockEmployee],
        total: 1,
        limit: 50,
        offset: 0,
        nextOffset: null,
      },
    });
  }),

  http.get(`${API_URL}/api/v1/employees/me/today`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        date: '2024-01-15',
        entries: mockTimeEntries,
        summary: null,
        reminders: [],
        settings: {
          feature_clock_enabled: true,
          feature_lunch_enabled: true,
          feature_breaks_enabled: true,
          feature_comments_enabled: true,
          feature_gps_enabled: false,
          lunch_minimum_minutes: 30,
        },
      },
    });
  }),

  http.get(`${API_URL}/api/v1/employees/me/history`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        items: mockTimeEntries,
        total: mockTimeEntries.length,
        limit: 50,
        offset: 0,
        nextOffset: null,
      },
    });
  }),

  http.get(`${API_URL}/api/v1/settings/geofence`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        enabled: false,
        mode: 'warn',
        locations: [],
      },
    });
  }),

  http.get(`${API_URL}/api/v1/admin/employees/:id`, ({ params }) => {
    if (params.id === mockEmployee.id) {
      return HttpResponse.json({
        status: 'success',
        data: mockEmployee,
      });
    }
    return HttpResponse.json(
      { status: 'error', message: 'Not found' },
      { status: 404 }
    );
  }),

  http.post(`${API_URL}/api/v1/admin/employees`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      status: 'success',
      data: {
        id: `emp-${Date.now()}`,
        ...body,
        is_active: true,
        access_status: 'PENDING',
      },
    });
  }),

  // Compliance endpoints
  http.get(`${API_URL}/api/v1/admin/compliance/dashboard`, () => {
    return HttpResponse.json({
      status: 'success',
      data: mockComplianceStats,
    });
  }),

  http.get(`${API_URL}/api/v1/admin/compliance/violations`, () => {
    return HttpResponse.json({
      status: 'success',
      data: [],
    });
  }),

  http.get(`${API_URL}/api/v1/admin/compliance/alerts`, () => {
    return HttpResponse.json({
      status: 'success',
      data: mockComplianceStats.alerts,
    });
  }),

  http.get(`${API_URL}/api/v1/admin/compliance/waivers`, () => {
    return HttpResponse.json({
      status: 'success',
      data: [],
    });
  }),

  http.get(`${API_URL}/api/v1/admin/compliance/attestations`, () => {
    return HttpResponse.json({
      status: 'success',
      data: [],
    });
  }),

  // Certification endpoints
  http.post(`${API_URL}/api/v1/certifications`, () => {
    return HttpResponse.json({
      status: 'success',
      data: { certified: true },
    });
  }),

  http.get(`${API_URL}/api/v1/certifications/pending`, () => {
    return HttpResponse.json({
      status: 'success',
      data: null,
    });
  }),

  // Settings endpoints
  http.get(`${API_URL}/api/v1/admin/settings`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        company_name: 'Test Company',
        timezone: 'America/Los_Angeles',
        session_duration_employee: 28800,
        session_duration_admin: 86400,
        failed_login_lockout_count: 5,
        failed_login_lockout_minutes: 15,
        meal_waiver_text: 'I voluntarily waive my meal period.',
        daily_attestation_text: 'I certify that the above times are accurate.',
        geofencing_enabled: false,
        geofence_radius_meters: 100,
        mfa_required_admin: false,
      },
    });
  }),

  http.put(`${API_URL}/api/v1/admin/settings`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      status: 'success',
      data: body,
    });
  }),

  // Audit log endpoints
  http.get(`${API_URL}/api/v1/admin/audit-log`, () => {
    return HttpResponse.json({
      status: 'success',
      data: [
        {
          id: 'log-1',
          actor_type: 'EMPLOYEE',
          actor_id: 'emp-1',
          actor_identifier: 'JD',
          action: 'LOGIN',
          details: null,
          ip_address: '127.0.0.1',
          created_at: '2024-01-15T08:00:00Z',
        },
      ],
    });
  }),

  // Waiver endpoints
  http.post(`${API_URL}/api/v1/waivers`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        id: `waiver-${Date.now()}`,
        signed: true,
      },
    });
  }),

  http.get(`${API_URL}/api/v1/waivers`, () => {
    return HttpResponse.json({
      status: 'success',
      data: [],
    });
  }),

  // Attestation endpoints
  http.post(`${API_URL}/api/v1/attestations`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        id: `attestation-${Date.now()}`,
        signed: true,
      },
    });
  }),

  http.get(`${API_URL}/api/v1/attestations`, () => {
    return HttpResponse.json({
      status: 'success',
      data: [],
    });
  }),

  // Reports endpoints
  http.get(`${API_URL}/api/v1/admin/reports/:type`, () => {
    return new HttpResponse('id,name,date\n1,Test,2024-01-15', {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  }),

  // Admin entries endpoints
  http.get(`${API_URL}/api/v1/admin/entries`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        items: mockTimeEntries,
        total: mockTimeEntries.length,
        limit: 200,
        offset: 0,
        nextOffset: null,
      },
    });
  }),

  // Corrections endpoints
  http.get(`${API_URL}/api/v1/admin/entries/corrections`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        items: [],
        total: 0,
        limit: 200,
        offset: 0,
        nextOffset: null,
      },
    });
  }),

  http.post(`${API_URL}/api/v1/admin/entries/:id/corrections`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        id: `correction-${Date.now()}`,
        status: 'PENDING',
      },
    });
  }),

  http.post(`${API_URL}/api/v1/admin/entries/corrections`, () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        id: `correction-${Date.now()}`,
        status: 'PENDING',
      },
    });
  }),

  http.post(`${API_URL}/api/v1/admin/entries/corrections/:id/approve`, () => {
    return HttpResponse.json({
      status: 'success',
      data: { status: 'APPROVED' },
    });
  }),

  http.post(`${API_URL}/api/v1/admin/entries/corrections/:id/reject`, () => {
    return HttpResponse.json({
      status: 'success',
      data: { status: 'REJECTED' },
    });
  }),

  http.post(`${API_URL}/api/v1/admin/entries/corrections/:id/apply`, () => {
    return HttpResponse.json({
      status: 'success',
      data: { status: 'APPLIED' },
    });
  }),
];
