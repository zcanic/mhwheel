import { test, expect } from '@playwright/test';

test.describe('Single Spin', () => {
  test('spins and produces a result (fast test mode)', async ({ page }) => {
    await page.addInitScript(() => { window.__TEST_FAST__ = true; });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '开始占卜' }).click();
    await page.waitForTimeout(800); // fast mode should finish quickly
    const resultWeapon = await page.locator('#resultWeapon').innerText();
    expect(resultWeapon.length).toBeGreaterThan(0);
  });
});
