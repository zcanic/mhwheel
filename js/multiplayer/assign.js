// assign.js - 多人模式分配逻辑（<200行）
// 职责：根据是否允许重复，生成玩家武器+挑战结果，支持重roll。
import { weapons, challenges } from '../data.js';
import { appState, getPlayers, getActiveWeapons, getAllowDuplicate, setAssigning, updatePlayer, resetMultiplayerResults, setTeamChallenge } from '../state/appState.js';
import { getMetalSynth } from '../sound.js';

const metal = getMetalSynth();

export async function startAssignment(){
  const players = getPlayers();
  const active = weapons.filter(w=>getActiveWeapons().includes(w.name));
  const allowDup = getAllowDuplicate();
  if (!allowDup && active.length < players.length){
    alert(`武器数量不足！请至少选择 ${players.length} 种武器，或开启“允许重复”。`);
    return;
  }
  setAssigning(true);
  resetMultiplayerResults();
  let results;
  if (allowDup){
    results = players.map(p=>({ id:p.id, weapon: active[Math.random()*active.length|0], challenge: randChallenge() }));
  } else {
    let pool = [...active];
    results = players.map(p=>{ const idx=Math.random()*pool.length|0; const w=pool[idx]; pool.splice(idx,1); return { id:p.id, weapon:w, challenge: randChallenge() }; });
  }
  for (let r of results){
    await wait(500);
    try { metal.triggerAttackRelease('C5','8n'); } catch {}
    updatePlayer(r.id,{ weapon:r.weapon, challenge:r.challenge, isRevealed:true });
  }
  if (Math.random()<0.25) setTeamChallenge(randChallenge());
  setAssigning(false);
}

export function reroll(playerId){
  const player = getPlayers().find(p=>p.id===playerId);
  if(!player || player.rerollsLeft<=0) return;
  const active = weapons.filter(w=>getActiveWeapons().includes(w.name));
  const allowDup = getAllowDuplicate();
  let pool;
  if (allowDup){
    pool = active;
    if (pool.length>1){
      let nw; do { nw = pool[Math.random()*pool.length|0]; } while(nw.name===player.weapon?.name); player.weapon = nw;
    } else player.weapon = pool[0];
  } else {
    const others = getPlayers().filter(p=>p.id!==playerId && p.weapon).map(p=>p.weapon.name);
    pool = active.filter(w=>!others.includes(w.name));
    if (pool.length<=1 && pool[0]?.name===player.weapon?.name){ alert('没有可供重roll的武器了！'); return; }
    let nw; do { nw = pool[Math.random()*pool.length|0]; } while(nw.name===player.weapon?.name && pool.length>1); player.weapon = nw;
  }
  // 使用 updatePlayer 触发订阅渲染
  updatePlayer(playerId, { weapon: player.weapon, challenge: randChallenge(), rerollsLeft: player.rerollsLeft - 1 });
}

function randChallenge(){ return challenges[Math.random()*challenges.length|0]; }
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
