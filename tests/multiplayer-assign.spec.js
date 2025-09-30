import { test, expect } from '@playwright/test';

test.describe('Multiplayer Assign', () => {
  test('assigns weapons to players (no duplicates when disabled)', async ({ page }) => {
    await page.addInitScript(() => { window.__TEST_FAST__ = true; });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    // Switch to multi mode
    await page.getByRole('button', { name: '多人模式' }).click();
    // Add up to 3 players (initial may have 2 by default depending on state, ensure at least 3)
    for (let i=0;i<2;i++) {
      const btn = page.locator('#addPlayerBtn');
      if (await btn.isEnabled()) await btn.click();
    }
    // Disable duplicates
    const dupToggle = page.locator('#allowDuplicateWeapons');
    if (await dupToggle.isChecked()) await dupToggle.uncheck();
    await page.locator('#generateMultiButton').click();
    await page.waitForFunction(() => window.shareController && typeof window.shareController.getState === 'function');
    await page.waitForFunction(() => window.shareController.getState().multiplayer.isAssigning === true);
    await page.waitForFunction(() => window.shareController.getState().multiplayer.isAssigning === false);
    const weaponNames = await page.locator('.player-card .weapon-name').allInnerTexts();
    expect(weaponNames.length).toBeGreaterThan(0);
    const unique = new Set(weaponNames);
    expect(unique.size).toBe(weaponNames.length);
  });
});
