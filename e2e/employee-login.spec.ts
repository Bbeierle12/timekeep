import { test, expect, testEmployee, checkAccessibility } from './fixtures';

test.describe('Employee Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /timekeep|login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/initials/i)).toBeVisible();
    await expect(page.getByPlaceholder(/pin|\*\*\*\*/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[placeholder*="initials" i], input[name="initials"]', 'XXX');
    await page.fill('input[type="password"], input[name="pin"]', '0000');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[placeholder*="initials" i], input[name="initials"]', testEmployee.initials);
    await page.fill('input[type="password"], input[name="pin"]', testEmployee.pin);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should pass accessibility checks', async ({ page }) => {
    await checkAccessibility(page);
  });
});
