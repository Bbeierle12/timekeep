---
created: 2026-02-05T22:03:45Z
last_updated: 2026-02-05T22:03:45Z
version: 1.0
author: Claude Code PM System
---

# Product Context

## User Personas

### Employee (Primary User)
- Non-technical workers
- Needs simple, fast clock-in/out
- Uses mobile or shared kiosk
- Wants to see their hours and upcoming breaks
- Must certify time entries before payroll

### Admin/Manager
- Manages team schedules
- Reviews and approves time entries
- Handles corrections and disputes
- Monitors compliance dashboard
- Runs reports for payroll

### Owner/Compliance Officer
- Configures company-wide settings
- Sets compliance rules and thresholds
- Reviews audit logs
- Ensures legal compliance
- Manages admin accounts

## Core User Stories

### Employee
- As an employee, I can clock in/out quickly so I don't waste time
- As an employee, I receive break reminders so I stay compliant
- As an employee, I can view my time history so I know my hours
- As an employee, I certify my daily time so records are accurate
- As an employee, I can waive meal breaks when allowed

### Admin
- As an admin, I can view all employee time entries in real-time
- As an admin, I receive alerts for potential violations
- As an admin, I can correct time entries with full audit trail
- As an admin, I can generate compliance reports
- As an admin, I can import employees from CSV

### Owner
- As an owner, I configure compliance thresholds
- As an owner, I manage admin accounts and permissions
- As an owner, I view company-wide compliance metrics
- As an owner, I ensure data retention policies are met

## California Compliance Rules

### Meal Breaks
- First meal break: Before 5th hour of work
- Second meal break: Before 10th hour (if working 10+ hours)
- Minimum duration: 30 minutes
- Waivable: First break if shift ≤6 hours (with consent)

### Rest Breaks
- 10 minutes per 4 hours worked
- Paid time (on the clock)
- Should be mid-shift when practical

### Overtime
- Daily overtime: After 8 hours
- Daily double-time: After 12 hours
- Weekly overtime: After 40 hours
- 7th consecutive day rules apply

## Feature Priorities

1. **Must Have**: Clock in/out, meal tracking, certification
2. **Should Have**: Compliance alerts, admin dashboard, reports
3. **Nice to Have**: Mobile app, GPS tracking, push notifications
4. **Future**: Payroll integration, scheduling, multi-company

## Business Metrics

- Time to clock in: < 5 seconds
- Meal break compliance rate: Target 100%
- Certification completion: Before payroll cutoff
- System uptime: 99.9%
