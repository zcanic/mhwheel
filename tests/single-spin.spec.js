import { test, expect } from '@playwright/test';

test.describe('Single Spin', () => {
  test('spins and produces a result (fast test mode)', async ({ page }) => {
      await page.addInitScript(() => {
        window.__TEST_FAST__ = true;
        window.__TEST_CAPTURE_SPIN__ = true;
      });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '开始占卜' }).click();
      await page.waitForFunction(() => window.__TEST_SPIN_ANGLE__ > 0, { timeout: 2000 });
      await page.waitForTimeout(200);
    const resultWeapon = await page.locator('#resultWeapon').innerText();
    expect(resultWeapon.length).toBeGreaterThan(0);
      const angle = await page.evaluate(() => window.__TEST_SPIN_ANGLE__);
      expect(angle).toBeGreaterThan(0);
  });
});
