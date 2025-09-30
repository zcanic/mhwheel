// appState.js - 全局状态（<200行）
// 职责：集中存放应用运行时状态，提供受控读写接口。
// 不包含 DOM 操作与具体业务算法，方便跨模块共享与测试。

export const appState = {
  mode: 'single',
  activeWeaponNames: [], // 初始化时由入口填充
  isAudioReady: false,
  spin: { weapon: null, challenge: null, showChallenge: false, isSpinning: false },
  multiplayer: {
    isAssigning: false,
    teamChallenge: null,
    allowDuplicateWeapons: true,
    players: [
      { id: 'player-1', name: '玩家1', weapon: null, challenge: null, rerollsLeft: 1, isRevealed: true },
      { id: 'player-2', name: '玩家2', weapon: null, challenge: null, rerollsLeft: 1, isRevealed: true }
    ]
  }
};

// 简易订阅系统（轻量 Observer）
const listeners = new Set();
export function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
export function emit(){ for (const fn of listeners) fn(appState); }

// 状态操作辅助
export function setMode(mode){ if (appState.mode!==mode){ appState.mode = mode; emit(); } }
export function setActiveWeapons(names){ appState.activeWeaponNames = [...names]; emit(); }
export function updateSpin(patch){ Object.assign(appState.spin, patch); emit(); }
export function resetSpin(){ appState.spin.weapon=null; appState.spin.challenge=null; appState.spin.showChallenge=false; appState.spin.isSpinning=false; emit(); }
export function resetMultiplayerResults(){
  const mp = appState.multiplayer;
  mp.teamChallenge = null;
  mp.players.forEach(p=>{ p.weapon=null; p.challenge=null; p.rerollsLeft=1; p.isRevealed=false; });
  emit();
}
export function addPlayer(player){ const mp=appState.multiplayer; if (mp.players.length<4){ mp.players.push(player); emit(); } }
export function removePlayer(id){ const mp=appState.multiplayer; if (mp.players.length>2){ mp.players = mp.players.filter(p=>p.id!==id); emit(); } }
export function updatePlayer(id, patch){ const p=appState.multiplayer.players.find(p=>p.id===id); if(p){ Object.assign(p, patch); emit(); } }
export function setAllowDuplicate(flag){ appState.multiplayer.allowDuplicateWeapons = !!flag; emit(); }
export function setAssigning(flag){ appState.multiplayer.isAssigning = flag; emit(); }
export function setTeamChallenge(ch){ appState.multiplayer.teamChallenge = ch || null; emit(); }

// 工具获取
export function getPlayers(){ return appState.multiplayer.players; }
export function getActiveWeapons(){ return appState.activeWeaponNames; }
export function getAllowDuplicate(){ return appState.multiplayer.allowDuplicateWeapons; }

// 该文件保持紧凑，便于后续扩展（<200行限制）
