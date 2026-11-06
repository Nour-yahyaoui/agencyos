import { expect, test } from '@playwright/test';

test('landing background falls back without WebGPU and does not appear on sign-in', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
  });
  await page.goto('/');
  await expect(page.getByTestId('landing-background')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'What is late, and what is unpaid.' })).toBeVisible();
  // A failed GPU initialization must not block the landing page's links.
  await page.getByRole('link', { name: 'Explore the demo' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('landing-background')).toHaveCount(0);
});

test('reduced motion uses the static landing fallback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('landing-background')).toHaveCount(1);
  await expect(page.getByTestId('landing-background').locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Create a workspace' })).toBeVisible();
});
