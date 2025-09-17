// main.js - v4 (Final Multiplayer + Share)
import { weapons, challenges } from './data.js';
import { preloadWeaponIcons } from './utils.js';
import { drawWheel, getRotation, setRotation, getSpinSpeed, setSpinSpeed, setIsSpinning, setHighlightedSectorIndex, clearHighlightTimeout, setHighlightTimeout } from './wheel.js';
import { setupSelector, updateWeaponSelectorUI } from './ui.js';
import { getSynth, getMetalSynth } from './sound.js';
import { ShareController } from './share/controller.js';
import { getSettingsManager } from './settings.js';

// --- 合成器实例 ---
const synth = getSynth();
const metalSynth = getMetalSynth();

// --- 预设管理器实例 ---
const settingsManager = getSettingsManager();

// --- DOM元素缓存 ---
const DOMElements = {
    // single player
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
    // multi player
    addPlayerBtn: document.getElementById('addPlayerBtn'),
    generateMultiButton: document.getElementById('generateMultiButton'),
    multiPlayerCardContainer: document.getElementById('multiPlayerCardContainer'),
    teamChallengeContainer: document.getElementById('teamChallengeContainer'),
    multiWeaponSelector: document.getElementById('multiWeaponSelector'),
    multiSelectAll: document.getElementById('multiSelectAll'),
    multiDeselectAll: document.getElementById('multiDeselectAll'),
    // common
    modeButtons: document.querySelectorAll('.mode-btn'),
    singleModeContent: document.getElementById('singleModeContent'),
    multiModeContent: document.getElementById('multiModeContent'),
};
const ctx = DOMElements.canvas ? DOMElements.canvas.getContext('2d') : null;

// --- 单一数据源 (Single Source of Truth) ---
let nextPlayerId = 3;
const appState = {
    mode: 'single',
    activeWeaponNames: weapons.map(w => w.name),
    isSpinning: false,
    isAudioReady: false,
    spinResult: { weapon: null, challenge: null, showChallenge: false },
    multiplayer: {
        isAssigning: false,
        teamChallenge: null,
        players: [
            { id: 1, name: '玩家1', weapon: null, challenge: null, rerollsLeft: 1, isRevealed: true },
            { id: 2, name: '玩家2', weapon: null, challenge: null, rerollsLeft: 1, isRevealed: true },
    ],
    allowDuplicateWeapons: true
    }
};

// --- 渲染引擎 ---

function renderPlayerCards() {
    const container = DOMElements.multiPlayerCardContainer;
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    appState.multiplayer.players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.dataset.playerId = player.id;

        const canRemove = appState.multiplayer.players.length > 2;
        const removeBtnHTML = canRemove ? 
            `<button class="remove-player-btn" title="移除玩家" data-player-id="${player.id}">×</button>` : '';

        let weaponResultHTML;
        if (appState.multiplayer.isAssigning && !player.isRevealed) {
            const reelHTML = weapons.map(w => `<div class="weapon-icon" style="background-image: url(${w.icon})"></div>`).join('');
            weaponResultHTML = `<div class="slot-machine-effect"><div class="slot-machine-reel">${reelHTML}</div></div>`;
        } else if (player.weapon) {
            weaponResultHTML = `
                <div class="weapon-icon" style="background-image: url(${player.weapon.icon})"></div>
                <div class="weapon-name" style="color: ${player.weapon.color}">${player.weapon.name}</div>
            `;
        } else {
            weaponResultHTML = '<div class="text-zinc-400">等待分配...</div>';
        }

        const challengeHTML = player.challenge ? `<div class="player-challenge">个人挑战: ${player.challenge}</div>` : '';
        const rerollBtnHTML = player.weapon && player.isRevealed ? `
            <button class="reroll-btn mt-2" data-player-id="${player.id}" ${player.rerollsLeft === 0 ? 'disabled' : ''}>
                重roll (${player.rerollsLeft})
            </button>
        ` : '';

        card.innerHTML = `
            ${removeBtnHTML}
            <input type="text" class="player-name-input" value="${player.name}" placeholder="输入昵称...">
            <div class="player-weapon-result">${weaponResultHTML}</div>
            ${challengeHTML}
            <div class="text-center">${rerollBtnHTML}</div>
        `;
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

function render() {
    const activeWeapons = weapons.filter(w => appState.activeWeaponNames.includes(w.name));
    DOMElements.modeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === appState.mode));
    DOMElements.singleModeContent.classList.toggle('hidden', appState.mode !== 'single');
    DOMElements.multiModeContent.classList.toggle('hidden', appState.mode !== 'multi');
    
    updateWeaponSelectorUI(appState.activeWeaponNames);

    if (appState.mode === 'single') {
        if (!appState.isSpinning) drawWheel(ctx, DOMElements.canvas, activeWeapons);
        const { weapon, showChallenge, challenge } = appState.spinResult;
        DOMElements.resultCard.classList.toggle('visible', !!weapon);
        if (weapon) {
            DOMElements.resultWeapon.textContent = weapon.name;
            DOMElements.resultFlavor.textContent = weapon.flavor;
        }
        DOMElements.challengeContainer.classList.toggle('visible', showChallenge);
        if (showChallenge) DOMElements.challengeText.textContent = challenge;
        DOMElements.spinButton.disabled = appState.isSpinning || activeWeapons.length < 2;
        DOMElements.spinButton.textContent = appState.isSpinning ? "占卜中..." : (appState.spinResult.weapon ? "再次占卜" : "开始占卜");
    }

    if (appState.mode === 'multi') {
        renderPlayerCards();
        DOMElements.addPlayerBtn.disabled = appState.multiplayer.isAssigning || appState.multiplayer.players.length >= 4;
        // 若允许重复，则只需至少有一种武器；否则需要武器数 >= 玩家数
        const needDisable = appState.multiplayer.isAssigning || (
            appState.multiplayer.allowDuplicateWeapons
                ? activeWeapons.length < 1
                : activeWeapons.length < appState.multiplayer.players.length
        );
        DOMElements.generateMultiButton.disabled = needDisable;
        
        const teamChallenge = appState.multiplayer.teamChallenge;
        DOMElements.teamChallengeContainer.classList.toggle('hidden', !teamChallenge);
        if(teamChallenge) {
            DOMElements.teamChallengeContainer.innerHTML = `<div class="team-challenge-card"><h4>团队挑战</h4><p>${teamChallenge}</p></div>`;
        }
    }

    // 更新分享控制器UI（如果存在）
    if (window.shareController) {
        window.shareController.updateUI(appState);
    }
}

// --- 状态更新与逻辑处理 ---

function ensureAudioIsReady() {
    if (appState.isAudioReady) return;
    try {
        Tone.start();
        appState.isAudioReady = true;
        console.log('AudioContext is ready.');
    } catch (e) { console.error("Failed to start AudioContext:", e); }
}

function resetSpinResult() {
    appState.spinResult = { weapon: null, challenge: null, showChallenge: false };
}

function resetMultiplayerResults() {
    appState.multiplayer.teamChallenge = null;
    appState.multiplayer.players.forEach(p => {
        p.weapon = null;
        p.challenge = null;
        p.rerollsLeft = 1;
        p.isRevealed = false;
    });
}

function handleWeaponToggle(weaponName) {
    const isActive = appState.activeWeaponNames.includes(weaponName);
    appState.activeWeaponNames = isActive
        ? appState.activeWeaponNames.filter(name => name !== weaponName)
        : [...appState.activeWeaponNames, weaponName];
    resetSpinResult();
    
    // 无感化自动保存武器池配置
    settingsManager.updateSettings({ activeWeaponNames: appState.activeWeaponNames });
    
    render();
}

function selectAllWeapons(select) {
    appState.activeWeaponNames = select ? weapons.map(w => w.name) : [];
    resetSpinResult();
    
    // 无感化自动保存武器池配置
    settingsManager.updateSettings({ activeWeaponNames: appState.activeWeaponNames });
    
    render();
}

function setMode(mode) {
    if (appState.mode === mode) return;
    appState.mode = mode;
    
    // 无感化自动保存模式选择
    settingsManager.updateSettings({ lastMode: mode });
    
    render();
}

// -- Multiplayer Logic --
function addPlayer() {
    if (appState.multiplayer.players.length >= 4) return;
    appState.multiplayer.players.push({
        id: nextPlayerId++,
        name: `玩家${appState.multiplayer.players.length + 1}`,
        weapon: null, challenge: null, rerollsLeft: 1, isRevealed: true
    });
    render();
}

function removePlayer(id) {
    if (appState.multiplayer.players.length <= 2) return;
    appState.multiplayer.players = appState.multiplayer.players.filter(p => p.id !== id);
    render();
}

function updatePlayerName(id, name) {
    const player = appState.multiplayer.players.find(p => p.id === id);
    if (player) player.name = name;
}

async function startMultiplayerAssignment() {
    const { players } = appState.multiplayer;
    const activeWeapons = weapons.filter(w => appState.activeWeaponNames.includes(w.name));
    if (!appState.multiplayer.allowDuplicateWeapons && activeWeapons.length < players.length) {
        alert(`武器数量不足！请至少选择 ${players.length} 种武器，或开启“允许重复”。`);
        return;
    }

    ensureAudioIsReady();
    appState.multiplayer.isAssigning = true;
    resetMultiplayerResults();
    render();

    let results;
    if (appState.multiplayer.allowDuplicateWeapons) {
        results = players.map(p => {
            const weapon = activeWeapons[Math.floor(Math.random() * activeWeapons.length)];
            const challenge = challenges[Math.floor(Math.random() * challenges.length)];
            return { ...p, weapon, challenge };
        });
    } else {
        let availableWeapons = [...activeWeapons];
        results = players.map(p => {
            const weaponIndex = Math.floor(Math.random() * availableWeapons.length);
            const weapon = availableWeapons[weaponIndex];
            availableWeapons.splice(weaponIndex, 1);
            const challenge = challenges[Math.floor(Math.random() * challenges.length)];
            return { ...p, weapon, challenge };
        });
    }

    for (let i = 0; i < results.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        try { metalSynth.triggerAttackRelease("C5", "8n", Tone.now(), 0.1); } catch(e) {}
        const player = appState.multiplayer.players.find(p => p.id === results[i].id);
        player.isRevealed = true;
        player.weapon = results[i].weapon;
        player.challenge = results[i].challenge;
        render();
    }

    if (Math.random() < 0.25) {
        appState.multiplayer.teamChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    }

    appState.multiplayer.isAssigning = false;
    render();
}

function rerollPlayerWeapon(playerId) {
    const player = appState.multiplayer.players.find(p => p.id === playerId);
    if (!player || player.rerollsLeft <= 0) return;
    let pool;
    if (appState.multiplayer.allowDuplicateWeapons) {
        pool = weapons.filter(w => appState.activeWeaponNames.includes(w.name));
        if (pool.length === 0) return;
        player.rerollsLeft -= 1;
        let newWeapon;
        if (pool.length === 1) {
            newWeapon = pool[0];
        } else {
            do {
                newWeapon = pool[Math.floor(Math.random() * pool.length)];
            } while (newWeapon.name === player.weapon.name);
        }
        player.weapon = newWeapon;
    } else {
        const otherPlayerWeapons = appState.multiplayer.players
            .filter(p => p.id !== playerId && p.weapon)
            .map(p => p.weapon.name);
        const availableWeapons = weapons.filter(w => 
            appState.activeWeaponNames.includes(w.name) && !otherPlayerWeapons.includes(w.name)
        );
        if (availableWeapons.length <= 1 && availableWeapons[0]?.name === player.weapon.name) {
            alert("没有可供重roll的武器了！");
            return;
        }
        player.rerollsLeft -= 1;
        let newWeapon;
        do {
            newWeapon = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
        } while (newWeapon.name === player.weapon.name && availableWeapons.length > 1);
        player.weapon = newWeapon;
    }

    player.challenge = challenges[Math.floor(Math.random() * challenges.length)];
    render();
}


// --- Single Player Spin Logic ---
let animationFrameId = null;
let lastAngle = 0;

function startSpin() {
    const spinningWeaponSet = weapons.filter(w => appState.activeWeaponNames.includes(w.name));
    if (appState.isSpinning || spinningWeaponSet.length < 2) return;

    ensureAudioIsReady();
    appState.isSpinning = true;
    resetSpinResult();
    
    DOMElements.spinButton.classList.add('pulse');
    DOMElements.pointer.style.transform = 'translateY(-5px)';
    
    render();
    
    setRotation(getRotation() % (2 * Math.PI));
    setSpinSpeed(Math.random() * 0.2 + 0.3);
    
    try { synth.triggerAttackRelease("C2", "8n"); } catch(e) { console.error("Sound failed:", e); }

    animate(spinningWeaponSet);
}

function animate(spinningWeaponSet) {
    let currentSpinSpeed = getSpinSpeed();
    if (currentSpinSpeed <= 0.001) {
        appState.isSpinning = false;
        setIsSpinning(false);
        setSpinSpeed(0);
        DOMElements.spinButton.classList.remove('pulse');
        DOMElements.pointer.classList.add('drop');
        setTimeout(() => DOMElements.pointer.classList.remove('drop'), 300);

        const finalAngle = getRotation() % (2 * Math.PI);
        const angleStep = (2 * Math.PI) / spinningWeaponSet.length;
        const correctedAngle = (1.5 * Math.PI - finalAngle + 2 * Math.PI) % (2 * Math.PI);
        const winningIndex = Math.floor(correctedAngle / angleStep);
        
        appState.spinResult.weapon = spinningWeaponSet[winningIndex];
        
        if (Math.random() > 0.25) {
            appState.spinResult.challenge = challenges[Math.floor(Math.random() * challenges.length)];
            appState.spinResult.showChallenge = true;
            try { synth.triggerAttackRelease("E4", "8n", Tone.now() + 0.5); } catch(e) { console.error("Sound failed:", e); }
        }
        
        DOMElements.resultWeapon.classList.add('pop');
        setTimeout(() => DOMElements.resultWeapon.classList.remove('pop'), 300);
        if(appState.spinResult.showChallenge) {
            DOMElements.challengeText.classList.add('slide-in');
            setTimeout(() => DOMElements.challengeText.classList.remove('slide-in'), 500);
        }

        setHighlightedSectorIndex(winningIndex);
        clearHighlightTimeout();
        setHighlightTimeout(() => { setHighlightedSectorIndex(undefined); render(); }, 500);

        try { synth.triggerAttackRelease("G4", "0.5s"); } catch(e) { console.error("Sound failed:", e); }
        
        render();
        return;
    }

    setRotation(getRotation() + currentSpinSpeed);
    setSpinSpeed(currentSpinSpeed * 0.98);

    const currentAngle = Math.floor(getRotation() * (spinningWeaponSet.length / (Math.PI * 2)));
    if (currentAngle !== lastAngle) {
        try { metalSynth.triggerAttackRelease("C5", "8n", Tone.now(), 0.1); } catch(e) { console.error("Sound failed:", e); }
        lastAngle = currentAngle;
    }
    
    drawWheel(ctx, DOMElements.canvas, spinningWeaponSet);
    animationFrameId = requestAnimationFrame(() => animate(spinningWeaponSet));
}

// --- 初始化与事件绑定 ---
document.addEventListener('DOMContentLoaded', () => {
    if (!ctx && appState.mode === 'single') {
        console.error('Canvas context is not available for single player mode.');
        return;
    }

    // Common
    DOMElements.modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
    
    // Single Player
    DOMElements.spinButton.addEventListener('click', startSpin);
    DOMElements.selectAllBtn.addEventListener('click', () => selectAllWeapons(true));
    DOMElements.deselectAllBtn.addEventListener('click', () => selectAllWeapons(false));
    setupSelector(DOMElements.weaponSelector, handleWeaponToggle);

    // 轻量化设置重置功能
    const resetBtn = document.getElementById('resetSettings');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有设置吗？这将清除已保存的武器选择和模式偏好。')) {
                try {
                    settingsManager.resetSettings();
                    // 重置appState到默认状态
                    appState.activeWeaponNames = weapons.map(w => w.name);
                    appState.mode = 'single';
                    render();
                } catch (error) {
                    console.warn('Failed to reset settings:', error);
                }
            }
        });
    }

    // Multi Player
    DOMElements.addPlayerBtn.addEventListener('click', addPlayer);
    DOMElements.generateMultiButton.addEventListener('click', startMultiplayerAssignment);
    DOMElements.multiSelectAll.addEventListener('click', () => selectAllWeapons(true));
    DOMElements.multiDeselectAll.addEventListener('click', () => selectAllWeapons(false));
    setupSelector(DOMElements.multiWeaponSelector, handleWeaponToggle);
    // 允许重复开关
    const allowDupToggle = document.getElementById('allowDuplicateWeapons');
    if (allowDupToggle) {
        allowDupToggle.addEventListener('change', (e) => {
            appState.multiplayer.allowDuplicateWeapons = !!e.target.checked;
            render();
        });
    }

    // 多人模式的设置重置功能
    const multiResetBtn = document.getElementById('multiResetSettings');
    if (multiResetBtn) {
        multiResetBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有设置吗？这将清除已保存的武器选择和模式偏好。')) {
                try {
                    settingsManager.resetSettings();
                    // 重置appState到默认状态
                    appState.activeWeaponNames = weapons.map(w => w.name);
                    appState.mode = 'single';
                    render();
                } catch (error) {
                    console.warn('Failed to reset settings:', error);
                }
            }
        });
    }
    DOMElements.multiPlayerCardContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('remove-player-btn')) {
            const playerId = parseInt(target.dataset.playerId, 10);
            removePlayer(playerId);
        }
        if (target.classList.contains('reroll-btn')) {
            const playerId = parseInt(target.dataset.playerId, 10);
            rerollPlayerWeapon(playerId);
        }
    });
    DOMElements.multiPlayerCardContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('player-name-input')) {
            const playerId = parseInt(e.target.closest('.player-card').dataset.playerId, 10);
            updatePlayerName(playerId, e.target.value);
        }
    });

    // Initial Load
    preloadWeaponIcons(weapons, render, render);
    
    // 无感化初始化预设管理器
    try {
        const loadedSettings = settingsManager.init((settings) => {
            // 应用加载的设置到appState（无感化）
            if (settings.activeWeaponNames && Array.isArray(settings.activeWeaponNames)) {
                // 验证武器名称的有效性，过滤掉不存在的武器
                const validWeaponNames = settings.activeWeaponNames.filter(name => 
                    weapons.some(w => w.name === name)
                );
                if (validWeaponNames.length > 0) {
                    appState.activeWeaponNames = validWeaponNames;
                }
            }
            
            if (settings.lastMode && ['single', 'multi'].includes(settings.lastMode)) {
                appState.mode = settings.lastMode;
            }
            
            // 重新渲染以应用设置
            render();
        });
        
        // 如果没有加载到设置，保存当前默认状态
        if (!loadedSettings) {
            settingsManager.updateSettings({
                activeWeaponNames: appState.activeWeaponNames,
                lastMode: appState.mode
            });
        }
    } catch (error) {
        console.warn('Settings initialization failed, using defaults:', error);
    }
    
    // 初始化分享控制器（独立初始化，不影响主要功能）
    try {
        const shareController = new ShareController();
        shareController.init(() => appState);
        // 将分享控制器暴露到全局，供render函数调用
        window.shareController = shareController;
    } catch (error) {
        console.warn('Share controller initialization failed:', error);
    }
    
    render();
});

window.addEventListener('beforeunload', () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    clearHighlightTimeout();
    
    // 清理预设管理器
    try {
        settingsManager.destroy();
    } catch (error) {
        console.warn('Failed to cleanup settings manager:', error);
    }
});