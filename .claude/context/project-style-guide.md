---
created: 2026-02-05T22:03:45Z
last_updated: 2026-02-05T22:03:45Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## TypeScript Conventions

### General
- Strict mode enabled
- Prefer `interface` over `type` for object shapes
- Use explicit return types on exported functions
- Avoid `any` - use `unknown` if type is truly unknown

### Naming
```typescript
// Variables and functions: camelCase
const userId = '123';
function getUserById(id: string) {}

// Types and interfaces: PascalCase
interface UserProfile {}
type ApiResponse<T> = {}

// Constants: UPPER_SNAKE_CASE (only for true constants)
const MAX_RETRIES = 3;

// Files: kebab-case for utilities, PascalCase for components
// user-utils.ts, UserProfile.tsx
```

### Imports
```typescript
// Order: external, internal, relative
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDate } from '../utils/date';
```

## React Conventions

### Component Structure
```tsx
// 1. Imports
// 2. Types/Interfaces
// 3. Component
// 4. Export

interface Props {
  title: string;
  onSave: () => void;
}

export function MyComponent({ title, onSave }: Props) {
  // Hooks first
  const [state, setState] = useState('');

  // Handlers
  const handleClick = () => {};

  // Render
  return <div>{title}</div>;
}
```

### Component Files
- One component per file
- Name file same as component: `UserProfile.tsx`
- Co-locate tests: `UserProfile.test.tsx` or `__tests__/UserProfile.test.tsx`

### Hooks
- Custom hooks in `hooks/` directory
- Prefix with `use`: `useAuth`, `useTimeEntries`
- Return object for multiple values: `{ data, loading, error }`

## API Conventions

### Endpoint Naming
```
GET    /api/v1/employees          # List
GET    /api/v1/employees/:id      # Get one
POST   /api/v1/employees          # Create
PUT    /api/v1/employees/:id      # Update
DELETE /api/v1/employees/:id      # Delete
POST   /api/v1/employees/:id/clock-in  # Action
```

### Response Format
```typescript
// Success
{
  status: 'success',
  data: { ... }
}

// Error
{
  status: 'error',
  message: 'Human readable message',
  code: 'ERROR_CODE'
}

// Paginated
{
  status: 'success',
  data: {
    items: [...],
    total: 100,
    limit: 20,
    offset: 0
  }
}
```

## Database Conventions

### Table Naming
- Plural: `employees`, `time_entries`
- Snake_case: `company_settings`, `audit_log`

### Column Naming
- Snake_case: `created_at`, `is_active`
- Foreign keys: `employee_id`, `admin_id`
- Booleans: `is_` or `has_` prefix

### Timestamps
- Always include `created_at` and `updated_at`
- Store in UTC
- Use `TIMESTAMP` type

## CSS/Styling

### Tailwind
- Use Tailwind utilities first
- Extract to components, not CSS classes
- Use `cn()` helper for conditional classes

```tsx
import { cn } from '@/lib/utils';

<button className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500',
  disabled && 'opacity-50'
)} />
```

### Design Tokens
- Colors defined in `tailwind.config.js`
- Use semantic names: `primary`, `destructive`, `muted`
- Consistent spacing scale

## Git Conventions

### Commit Messages
```
type: short description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- refactor: Code change (no feature/fix)
- test: Adding tests
- chore: Maintenance

Examples:
feat: add employee import functionality
fix: correct overtime calculation for 7th day
refactor: extract auth middleware
```

### Branch Naming
```
feature/employee-import
fix/overtime-calculation
refactor/auth-middleware
```

## Testing Conventions

### File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- E2E tests: `*.spec.ts`

### Test Structure
```typescript
describe('ComponentName', () => {
  describe('when condition', () => {
    it('should do expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Mocking
- Use MSW for API mocking in frontend
- Use Supertest for API testing in backend
- Avoid mocking implementation details
