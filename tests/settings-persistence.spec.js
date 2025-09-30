import { test, expect } from '@playwright/test';

test.describe('Settings persistence', () => {
  test('remembers weapon selection and mode after reload', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#deselectAll').click();
    await page.getByRole('button', { name: '多人模式' }).click();
    // 等待设置防抖写入 localStorage
    await page.waitForTimeout(1200);
    const storedBeforeReload = await page.evaluate(() => {
      const raw = localStorage.getItem('mhwheel_settings');
      return raw ? JSON.parse(raw) : null;
    });
    expect(storedBeforeReload?.data?.lastMode).toBe('multi');
    expect(storedBeforeReload?.data?.activeWeaponNames).toEqual([]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      if (!window.shareController || typeof window.shareController.getState !== 'function') return false;
      const state = window.shareController.getState();
      return state.mode === 'multi' && Array.isArray(state.activeWeaponNames);
    });
    const persistedState = await page.evaluate(() => {
      const state = window.shareController.getState();
      return { mode: state.mode, activeCount: state.activeWeaponNames.length };
    });
    expect(persistedState.mode).toBe('multi');
    expect(persistedState.activeCount).toBe(0);
  });
});
