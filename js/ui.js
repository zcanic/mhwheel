// 已废弃：请改用 js/ui/render.js 并通过 appState 订阅更新。

const warning = '[mhwheel] js/ui.js 已废弃，请迁移至 js/ui/render.js 或相关模块。';
if (typeof console !== 'undefined') {
  console.warn(warning);
}

export function setupSelector() {
  throw new Error(`${warning} setupSelector 已移除，不再支持旧接口。`);
}

export function updateWeaponSelectorUI() {
  throw new Error(`${warning} updateWeaponSelectorUI 已移除，不再支持旧接口。`);
}