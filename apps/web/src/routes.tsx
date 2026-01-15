export const routes = {
  employee: {
    login: '/employee/login',
    dashboard: '/employee',
    pendingCertification: '/employee/pending-certification',
    history: '/employee/history',
    changePin: '/employee/change-pin'
  },
  admin: {
    login: '/admin/login',
    dashboard: '/admin',
    employees: '/admin/employees',
    employeeDetail: '/admin/employees/:id',
    timeEntries: '/admin/time-entries',
    compliance: '/admin/compliance',
    reports: '/admin/reports',
    auditLog: '/admin/audit-log',
    settings: '/admin/settings',
    admins: '/admin/admins'
  }
};
