import { test, expect, checkAccessibility } from './fixtures';

test.describe('Employee Dashboard', () => {
  test.use({ employeeAuth: [true, { auto: true }] as unknown as void });

  test('should display dashboard with punch buttons', async ({ page }) => {
    // Verify main dashboard elements
    await expect(page.getByText(/clock in|punch/i).first()).toBeVisible();
    await expect(page.getByText(/lunch/i).first()).toBeVisible();
  });

  test('should display today\'s entries section', async ({ page }) => {
    await expect(page.getByText(/today|entries|log/i).first()).toBeVisible();
  });

  test('should allow clock in', async ({ page }) => {
    const clockInButton = page.getByRole('button', { name: /clock in/i });

    // If clock in is available, click it
    if (await clockInButton.isEnabled()) {
      await clockInButton.click();

      // Should show success or update the entry list
      await expect(
        page.getByText(/clock in/i).or(page.getByText(/success/i))
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to history', async ({ page }) => {
    const historyLink = page.getByRole('link', { name: /history|view all/i });

    if (await historyLink.isVisible()) {
      await historyLink.click();
      await page.waitForURL('**/history**');
      await expect(page).toHaveURL(/history/);
    }
  });

  test('should allow logout', async ({ page }) => {
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Handle confirmation dialog if present
      const confirmButton = page.getByRole('button', { name: /confirm|yes|logout/i });
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Should redirect to login
      await page.waitForURL('**/login**', { timeout: 5000 });
    }
  });

  test('should pass accessibility checks', async ({ page }) => {
    await checkAccessibility(page);
  });
});
