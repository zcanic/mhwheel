// 已废弃：多人逻辑已迁移至 js/multiplayer/assign.js。

const warning = '[mhwheel] js/multiplayer.js 已弃用，请改用 js/multiplayer/assign.js 提供的 API。';
if (typeof console !== 'undefined') {
  console.warn(warning);
}

export function assignWeaponsAndChallenges() {
  throw new Error(`${warning} assignWeaponsAndChallenges 已移除。`);
}

export function renderMultiplayerResults() {
  throw new Error(`${warning} renderMultiplayerResults 已移除。`);
}
