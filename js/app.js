// app.js - 模块化入口 (<200行)
// 职责：初始化 DOM 引用、事件绑定、整合各功能模块，无业务算法。
import { weapons } from './data.js';
import { preloadWeaponIcons } from './utils.js';
import { createDOMRefs, render } from './ui/render.js';
import { subscribe, appState, setMode, setActiveWeapons, updatePlayer, addPlayer, removePlayer, setAllowDuplicate, setAssigning, resetMultiplayerResults } from './state/appState.js';
import { startSpin } from './core/spin.js';
import { startAssignment, reroll } from './multiplayer/assign.js';
import { ShareController } from './share/controller.js';
import { getSettingsManager } from './settings.js';
import { getSynth, getMetalSynth } from './sound.js';

// 初始化根对象
const settingsManager = getSettingsManager();
const dom = {}; // 延迟填充
let shareController = null;

function persistActiveWeapons(names, { persist = true } = {}){
  const normalized = Array.isArray(names) ? [...new Set(names)] : [];
  setActiveWeapons(normalized);
  if (persist){
    try { settingsManager.updateSettings({ activeWeaponNames: normalized }); }
    catch(e){ console.warn('Persist active weapons failed', e); }
  }
}

function persistMode(mode, { persist = true } = {}){
  setMode(mode);
  if (persist){
    try { settingsManager.updateSettings({ lastMode: mode }); }
    catch(e){ console.warn('Persist mode failed', e); }
  }
}

function generatePlayerId(){
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'){
      return crypto.randomUUID();
    }
  } catch {/* noop */}
  return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initStateDefaults(){
  // 若首次加载未设置，激活全部武器
  if (!appState.activeWeaponNames.length) persistActiveWeapons(weapons.map(w=>w.name), { persist: false });
}

function bindEvents(){
  dom.modeButtons.forEach(btn=>{
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    btn.addEventListener('click', ()=>{
      persistMode(btn.dataset.mode);
      // 更新 pressed 状态
      dom.modeButtons.forEach(b=> b.setAttribute('aria-pressed', b.dataset.mode === appState.mode ? 'true':'false'));
    });
  });
  // 单人
  if (dom.spinButton) dom.spinButton.addEventListener('click', ()=>{
    const ctx = dom.canvas.getContext('2d');
    startSpin(ctx, dom.canvas, appState.activeWeaponNames);
  });
  if (dom.selectAllBtn) dom.selectAllBtn.addEventListener('click', ()=> persistActiveWeapons(weapons.map(w=>w.name)));
  if (dom.deselectAllBtn) dom.deselectAllBtn.addEventListener('click', ()=> persistActiveWeapons([]));
  // 多人
  if (dom.addPlayerBtn) dom.addPlayerBtn.addEventListener('click', ()=>{
    if (appState.multiplayer.isAssigning) return;
    if (appState.multiplayer.players.length >= 4) return;
    const id = generatePlayerId();
    addPlayer({ id, name:`玩家${appState.multiplayer.players.length+1}`, weapon:null, challenge:null, rerollsLeft:1, isRevealed:true });
    dom.addPlayerBtn.disabled = true;
  });
  if (dom.generateMultiButton) dom.generateMultiButton.addEventListener('click', ()=> startAssignment());
  if (dom.multiSelectAll) dom.multiSelectAll.addEventListener('click', ()=> persistActiveWeapons(weapons.map(w=>w.name)));
  if (dom.multiDeselectAll) dom.multiDeselectAll.addEventListener('click', ()=> persistActiveWeapons([]));
  if (dom.allowDuplicateToggle) dom.allowDuplicateToggle.addEventListener('change', e=> setAllowDuplicate(e.target.checked));
  // 玩家卡片事件代理
  if (dom.multiPlayerCardContainer){
    dom.multiPlayerCardContainer.addEventListener('click', e=>{
      const t=e.target;
      if (t.classList.contains('remove-player-btn')) removePlayer(t.dataset.playerId);
      if (t.classList.contains('reroll-btn')) reroll(t.dataset.playerId);
    });
    dom.multiPlayerCardContainer.addEventListener('input', e=>{
      if (e.target.classList.contains('player-name-input')){
        const id=e.target.closest('.player-card').dataset.playerId;
        updatePlayer(id,{ name:e.target.value });
      }
    });
  }
  // Reset 按钮（保持与旧逻辑一致）
  const resetBtn=document.getElementById('resetSettings');
  const multiResetBtn=document.getElementById('multiResetSettings');
  [resetBtn,multiResetBtn].forEach(btn=> btn && btn.addEventListener('click', ()=>{
    if (!confirm('确定要重置所有设置吗？')) return;
    try {
      settingsManager.resetSettings();
      persistMode('single');
      persistActiveWeapons(weapons.map(w=>w.name));
    } catch(e){ console.warn('Reset failed', e); }
  }));
}

function initSettings(){
  try {
    const loaded = settingsManager.init((s)=>{
      if (Array.isArray(s.activeWeaponNames)) persistActiveWeapons(s.activeWeaponNames, { persist: false });
      if (s.lastMode) persistMode(s.lastMode, { persist: false });
    });
    if (!loaded){ settingsManager.updateSettings({ activeWeaponNames: appState.activeWeaponNames, lastMode: appState.mode }); }
  } catch(e){ console.warn('Settings init failed', e); }
}

function initShare(){
  try { shareController = new ShareController(); shareController.init(()=>appState); window.shareController = shareController; } catch(e){ console.warn('Share init failed', e); }
}

function init(){
  Object.assign(dom, createDOMRefs());
  initStateDefaults();
  bindEvents();
  initSettings();
  initShare();
  // 预加载武器图标
  preloadWeaponIcons(weapons, null, ()=> render(dom));
  // 订阅渲染
  subscribe(()=> render(dom));
  render(dom);
  // Service Worker 注册
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW register failed', e));
  }
  // prefers-reduced-motion 额外 JS 降级（如后续动画添加 JS 驱动部分）
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) document.documentElement.classList.add('reduced-motion');
  // 开发自检：activeWeaponNames 必须是合法全集子集
  try {
    const all = new Set(weapons.map(w=>w.name));
    const invalid = appState.activeWeaponNames.filter(n=>!all.has(n));
    if (invalid.length) console.warn('[Invariant] 非法武器名被激活:', invalid);
  } catch(e){/* noop */}
}

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('beforeunload', ()=>{
  try { settingsManager.destroy(); } catch(e){/* noop */}
  if (shareController) shareController.destroy();
});
