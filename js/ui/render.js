// render.js - 统一渲染（<200行）
// 输入：appState + 预缓存的 DOM 元素
// 输出：同步界面，不含业务随机逻辑
import { appState } from '../state/appState.js';
import { weapons } from '../data.js';
import { drawWheel } from '../wheel.js';

export function createDOMRefs(){
  return {
    canvas: document.getElementById('wheelCanvas'),
    spinButton: document.getElementById('spinButton'),
    resultCard: document.getElementById('resultCard'),
    resultWeapon: document.getElementById('resultWeapon'),
    resultFlavor: document.getElementById('resultFlavor'),
    challengeContainer: document.getElementById('challengeContainer'),
    challengeText: document.getElementById('challengeText'),
    weaponSelector: document.getElementById('weaponSelector'),
    selectAllBtn: document.getElementById('selectAll'),
    deselectAllBtn: document.getElementById('deselectAll'),
    pointer: document.querySelector('.pointer'),
    addPlayerBtn: document.getElementById('addPlayerBtn'),
    generateMultiButton: document.getElementById('generateMultiButton'),
    multiPlayerCardContainer: document.getElementById('multiPlayerCardContainer'),
    teamChallengeContainer: document.getElementById('teamChallengeContainer'),
    multiWeaponSelector: document.getElementById('multiWeaponSelector'),
    multiSelectAll: document.getElementById('multiSelectAll'),
    multiDeselectAll: document.getElementById('multiDeselectAll'),
    allowDuplicateToggle: document.getElementById('allowDuplicateWeapons'),
    modeButtons: document.querySelectorAll('.mode-btn'),
    singleModeContent: document.getElementById('singleModeContent'),
    multiModeContent: document.getElementById('multiModeContent')
  };
}

export function render(dom){
  const activeWeapons = weapons.filter(w=>appState.activeWeaponNames.includes(w.name));
  dom.modeButtons.forEach(btn=>btn.classList.toggle('active', btn.dataset.mode===appState.mode));
  dom.singleModeContent.classList.toggle('hidden', appState.mode!=='single');
  dom.multiModeContent.classList.toggle('hidden', appState.mode!=='multi');

  if (appState.mode==='single') renderSingle(dom, activeWeapons);
  if (appState.mode==='multi') renderMulti(dom, activeWeapons);
  if (window.shareController) window.shareController.updateUI(appState);
}

function renderSingle(dom, active){
  if (!appState.spin.isSpinning && dom.canvas){
    const ctx = dom.canvas.getContext('2d');
    drawWheel(ctx, dom.canvas, active);
  }
  const { weapon, showChallenge, challenge } = appState.spin;
  dom.resultCard.classList.toggle('visible', !!weapon);
  if (weapon){
    dom.resultWeapon.textContent = weapon.name;
    dom.resultFlavor.textContent = weapon.flavor;
  }
  dom.challengeContainer.classList.toggle('visible', showChallenge);
  if (showChallenge) dom.challengeText.textContent = challenge;
  dom.spinButton.disabled = appState.spin.isSpinning || active.length < 2;
  dom.spinButton.textContent = appState.spin.isSpinning ? '占卜中...' : (weapon? '再次占卜':'开始占卜');
}

function renderMulti(dom, active){
  renderPlayerCards(dom.multiPlayerCardContainer);
  dom.addPlayerBtn.disabled = appState.multiplayer.isAssigning || appState.multiplayer.players.length>=4;
  const needDisable = appState.multiplayer.isAssigning || (
    appState.multiplayer.allowDuplicateWeapons ? active.length<1 : active.length < appState.multiplayer.players.length
  );
  dom.generateMultiButton.disabled = needDisable;
  const team = appState.multiplayer.teamChallenge;
  dom.teamChallengeContainer.classList.toggle('hidden', !team);
  if (team){
    dom.teamChallengeContainer.innerHTML = `<div class="team-challenge-card"><h4>团队挑战</h4><p>${team}</p></div>`;
  }
  if (dom.allowDuplicateToggle) dom.allowDuplicateToggle.checked = appState.multiplayer.allowDuplicateWeapons;
}

function renderPlayerCards(container){
  container.innerHTML='';
  const frag=document.createDocumentFragment();
  appState.multiplayer.players.forEach(p=>{
    const card=document.createElement('div');
    card.className='player-card';
    card.dataset.playerId=p.id;
    const canRemove = appState.multiplayer.players.length>2;
  const removeBtn = canRemove? `<button class="remove-player-btn" data-player-id="${p.id}" title="移除玩家" aria-label="移除玩家 ${p.name}">×</button>`:'';
    let body;
    if (appState.multiplayer.isAssigning && !p.isRevealed){
      body = `<div class='slot-machine-effect'><div class='slot-machine-reel'>${appState.activeWeaponNames.map(n=>`<div class='weapon-icon'></div>`).join('')}</div></div>`;
    } else if (p.weapon){
      body = `<div class='weapon-icon' style='background-image:url(${p.weapon.icon})'></div><div class='weapon-name' style='color:${p.weapon.color}'>${p.weapon.name}</div>`;
    } else body = `<div class='text-zinc-400'>等待分配...</div>`;
    const challengeHTML = p.challenge ? `<div class='player-challenge'>个人挑战: ${p.challenge}</div>`:'';
  const reroll = p.weapon && p.isRevealed ? `<button class='reroll-btn mt-2' data-player-id='${p.id}' aria-label='为 ${p.name} 重roll 武器' ${p.rerollsLeft===0?'disabled':''}>重roll (${p.rerollsLeft})</button>`:'';
    card.innerHTML = `${removeBtn}<input type='text' class='player-name-input' value='${p.name}' placeholder='输入昵称...'><div class='player-weapon-result'>${body}</div>${challengeHTML}<div class='text-center'>${reroll}</div>`;
    frag.appendChild(card);
  });
  container.appendChild(frag);
}
