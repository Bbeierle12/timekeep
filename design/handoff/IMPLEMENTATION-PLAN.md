# Cockpit Handoff — Implementation Plan

Source: `design/handoff/` (extracted from `TimeKeep-handoff.zip`, 2026-04-24).
Primary entry: `TimeKeep.html` → loads 13 `.jsx` prototype files (React UMD + Babel standalone + Tailwind CDN).

## Verification done
- All overlapping `apps/web/src/**` + `tailwind.config.js` files in the bundle are byte-identical to the workspace. No merges needed for those.
- New material is the **Cockpit theme** layer + a richer set of screens/panes/modals not yet in `apps/web`.

## Design system (from `tk-cockpit-primitives.jsx`)
- Aesthetic: black background `#000`, "instrument panel" — sharp 90° corners, hairline rules, tick-mark gauges, ALL CAPS labels.
- Tokens (from `CK` object):
  - `bg #000000`, `surface #0a0a0a`, `text #e8e6df`, `dim #8a857a`, `fade #3a3833`
  - `rule rgba(255,255,255,0.10)`, `rule2 rgba(255,255,255,0.18)`
  - Accents: `amber #ffb000` (primary), `alarm #ff3b3b` (sparse), `ok #69d27c`
- Type: IBM Plex Mono (default), IBM Plex Sans (display class `ck-display`), IBM Plex Sans Condensed (digital readouts). Tabular nums via `.ck-num`.
- Effects: scanline overlay (`.ck-scan`), CRT vignette (`.ck-vignette`), grid background (`.ck-grid`), corner brackets (`.ck-corners`), `ck-blink`, `ck-flash`, `ck-marquee`.
- Primitives exported on `window`: `CKLabel`, `CKValue`, `CKPanel`, `CKChip`, `CKBtn`, `CKMealScale`, `CKDigit`.
- **Hero component:** `CKMealScale` — vertical (mobile) / horizontal (admin) instrument-style meal-period gauge with 15-min ticks, 5-hour deadline marker, lunch segment overlay, blinking "now" indicator.

## App shell topology (from `tk-app.jsx`)
- Two top-level surfaces:
  - **Employee · iOS** rendered inside `IOSDevice` 390×844 frame (`ios-frame.jsx`)
  - **Admin · Desktop** full-viewport
- Employee screens (state `empScreen`): `login`, `shift`, `history`, `pay`, `timeoff`, `profile`
- Admin panes (state `adminPane`): `dashboard`, `team`, `employee`, `entries`, `schedule`, `payroll`, `audit`, `settings`
- Modals (sheets): `LunchWarningSheet`, `BreakAckSheet`, `WaiverSheet`, `AttestationSheet`
- Three compliance scenarios drive the mock data engine: `compliant`, `atRisk`, `violation` (see `tk-data.jsx`). These align 1:1 with the existing server-side `compliance.service.ts`, `attestation.service.ts`, `consent.service.ts`.

## Workspace gap analysis

### Already present (`apps/web/src/`)
- `pages/employee/{Login,Dashboard}.tsx`
- `pages/admin/{Login,Dashboard,TimeEntries,Compliance}.tsx`
- `components/employee/{EmployeeMenu,PunchButton,TimeLog}.tsx`
- `components/admin/Sidebar.tsx`
- `components/ui/{Button,Card}.tsx`

### Missing — to build (priority-ordered)

**P0 · Cockpit foundation** (everything below depends on this)
1. `apps/web/src/components/cockpit/tokens.ts` — port `CK` token object + CSS module / global injection (replace the runtime `injectCockpitCSS` IIFE with a static stylesheet under `apps/web/src/styles/cockpit.css`).
2. `apps/web/src/components/cockpit/primitives.tsx` — `CKLabel`, `CKValue`, `CKPanel`, `CKChip`, `CKBtn`, `CKDigit` as typed React components.
3. `apps/web/src/components/cockpit/MealScale.tsx` — port `CKMealScale` (vertical + horizontal). Driven by real time-entry data, not mocks.
4. Tailwind config: extend with cockpit palette (`amber: '#ffb000'`, `alarm: '#ff3b3b'`, `ok: '#69d27c'`, `surface: '#0a0a0a'`) and an `ibm-mono` / `ibm-sans` / `ibm-condensed` font family. Add `@fontsource/ibm-plex-mono` + `ibm-plex-sans` + `ibm-plex-sans-condensed` deps so we don't hit Google Fonts CDN in prod.

**P1 · Employee iOS surface**
5. `IOSDevice` frame component (`ios-frame.jsx`) — only needed if we ship the device-framed prototype shell to stakeholders; **decide with user** whether the production employee experience should be a literal iOS frame (web demo only) or fullscreen on the existing mobile app. The native app already lives in `apps/mobile/`; the iOS frame is almost certainly a *web preview* of a design that should ultimately be implemented in the React Native app.
6. `pages/employee/Shift.tsx` (current "active shift" — hero `MealScale`, current entries, status chips, action buttons) — replaces / extends current `employee/Dashboard.tsx`.
7. `pages/employee/ShiftHistory.tsx` (`CKShiftHistoryView`)
8. `pages/employee/Pay.tsx` (`CKPayView`) — wires to existing `certification.service` for `onCertify`.
9. `pages/employee/TimeOff.tsx` (`CKTimeOffView`) — **new server route needed** (no existing time-off model in `server/src/models/`).
10. `pages/employee/Profile.tsx` (`CKProfileView`)
11. Re-skin `pages/employee/Login.tsx` to cockpit aesthetic (`CKLoginView`).
12. Sheets: `components/cockpit/sheets/{LunchWarningSheet,BreakAckSheet,WaiverSheet,AttestationSheet}.tsx`. These bind to existing `attestation.service`, `waiver.service`/`waiver-text.ts`, and the `consent.service`.

**P2 · Admin desktop surface**
13. `pages/admin/cockpit/Dashboard.tsx` — KPI strip (clocked in / on lunch / on break / violations today / waivers / attestations / exposure $ / streak), live alerts feed, team status grid.
14. `pages/admin/cockpit/TeamBoard.tsx` (`team` pane) — roster cards with risk tone.
15. `pages/admin/cockpit/EmployeeFile.tsx` (`employee` pane) — drill-down.
16. `pages/admin/cockpit/Entries.tsx` (`entries` pane) — replaces / extends current `TimeEntries.tsx`. Tabular nums, ALL CAPS column headers, source/geofence chips.
17. `pages/admin/cockpit/Schedule.tsx` (`schedule` pane) — **new model needed** (no schedule model in current backend).
18. `pages/admin/cockpit/Payroll.tsx` (`payroll` pane) — joins `dailySummary` + premium-pay calc from `compliance.service`.
19. `pages/admin/cockpit/AuditLog.tsx` (`audit` pane) — wraps existing `auditLog` model output.
20. `pages/admin/cockpit/Settings.tsx` (`settings` pane).
21. Re-skin `components/admin/Sidebar.tsx` to cockpit nav.

**P3 · Plumbing & polish**
22. Routing (`apps/web/src/routes.tsx`) — add the new routes; preserve current ones behind a `?legacy=1` flag during migration.
23. Replace prototype's `useTweaks` / `TweaksPanel` with a dev-only debug panel gated by `import.meta.env.DEV`.
24. Wire mock-data scenarios in `tk-data.jsx` to **real API** clients in `apps/web/src/services/`. Fall back to mocks only in Storybook / Vitest.
25. Storybook (or component playground) for `cockpit/*` primitives — the prototype's literal value is in pixel-level details; need a way to verify them without the full app.
26. Visual regression: add Playwright screenshot tests for Shift / Dashboard / each modal under all 3 scenarios.

## Open questions to surface to user (only if blocked)
- Q1: Is the "iOS device frame" intended for the production web app, or only a stakeholder preview? (Affects whether `IOSDevice` ships to prod.)
- Q2: Should the cockpit theme **replace** the current employee/admin pages, or live alongside them as a "v2" surface during rollout?
- Q3: TimeOff and Schedule require new backend models — are those in scope for this handoff, or design-only for now?

## Build order (single-track, no parallelism assumed)
P0 → P1.5 (Login + Shift + at least one sheet, end-to-end with real API) → P1 remaining → P2 → P3.

Stop after P0 to confirm visual fidelity with the user before scaling out.
