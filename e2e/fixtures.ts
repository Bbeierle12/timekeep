import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test user credentials
export const testEmployee = {
  initials: 'TST',
  pin: '1234',
  name: 'Test Employee',
};

export const testAdmin = {
  email: 'admin@test.com',
  password: 'TestPassword123!',
  name: 'Test Admin',
};

// Extended test with custom fixtures
export const test = base.extend<{
  employeeAuth: void;
  adminAuth: void;
}>({
  // Fixture for authenticated employee
  employeeAuth: async ({ page }, use) => {
    // Navigate to login and authenticate
    await page.goto('/login');
    await page.fill('input[placeholder*="initials" i], input[name="initials"]', testEmployee.initials);
    await page.fill('input[type="password"], input[name="pin"]', testEmployee.pin);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    await use();
  },

  // Fixture for authenticated admin
  adminAuth: async ({ page }, use) => {
    await page.goto('/admin/login');
    await page.fill('input[type="email"], input[name="email"]', testAdmin.email);
    await page.fill('input[type="password"], input[name="password"]', testAdmin.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to admin dashboard
    await page.waitForURL('**/admin/dashboard**', { timeout: 10000 });

    await use();
  },
});

// Accessibility test helper
export async function checkAccessibility(page: Parameters<typeof AxeBuilder>[0], options?: { exclude?: string[] }) {
  const axe = new AxeBuilder({ page });

  if (options?.exclude) {
    axe.exclude(options.exclude);
  }

  const results = await axe.analyze();

  expect(results.violations).toEqual([]);
}

export { expect };
