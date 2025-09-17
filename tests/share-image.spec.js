import { test, expect } from '@playwright/test';

test.describe('Share Image Generation', () => {
  test('generates a PNG blob for multiplayer results', async ({ page }) => {
    await page.addInitScript(() => { window.__TEST_FAST__ = true; });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '多人模式' }).click();
    // Ensure at least one assignment so share button is enabled
    await page.locator('#generateMultiButton').click();
    // 等待至少一个玩家获得 weapon（轮询 state）
    await page.waitForFunction(() => {
      return window.shareController && window.shareController.getState && window.shareController.getState().multiplayer.players.some(p=>p.weapon);
    }, { timeout: 5000 });
    const size = await page.evaluate(async () => {
      const st = window.shareController.getState();
      const players = st.multiplayer.players.filter(p=>p.weapon);
      const blob = await window.shareController.imageGenerator.generateMultiplayerShareImage({ players, teamChallenge: st.multiplayer.teamChallenge });
      return blob.size;
    });
    expect(size).toBeGreaterThan(1000); // minimal sanity size
  });
});
