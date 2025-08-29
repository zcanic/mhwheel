/**
 * 为指定数量的玩家分配武器和挑战（纯函数）
 * @param {number} numPlayers - 玩家数量
 * @param {Array} availableWeapons - 可供选择的武器对象数组
 * @param {Array<string>} allChallenges - 可供选择的挑战字符串数组
 * @returns {Array|null} - 包含玩家分配结果的数组，如果武器不足则返回 null
 */
export function assignWeaponsAndChallenges(numPlayers, availableWeapons, allChallenges) {
    if (availableWeapons.length < numPlayers) {
        console.warn(`激活武器数 (${availableWeapons.length}) 小于玩家数 (${numPlayers})`);
        return null; // 武器不足
    }

    let weaponsToAssign = [...availableWeapons];
    const results = [];

    for (let i = 0; i < numPlayers; i++) {
        const weaponIndex = Math.floor(Math.random() * weaponsToAssign.length);
        const assignedWeapon = weaponsToAssign[weaponIndex];
        weaponsToAssign.splice(weaponIndex, 1); // 确保不重复分配

        const challengeIndex = Math.floor(Math.random() * allChallenges.length);
        const assignedChallenge = allChallenges[challengeIndex];

        results.push({
            playerNumber: i + 1,
            weapon: assignedWeapon,
            challenges: [assignedChallenge],
        });
    }

    return results;
}

/**
 * 渲染多人模式结果到页面
 * @param {Array|null} results - 分配结果数组，或在武器不足时为 null
 * @param {HTMLElement} containerEl - 用于展示结果的DOM容器
 * @param {number} numPlayers - 玩家数量，用于显示错误信息
 */
export function renderMultiplayerResults(results, containerEl, numPlayers) {
    containerEl.innerHTML = '';

    if (!results) {
        containerEl.innerHTML = `
            <div class="col-span-1 md:col-span-2 text-center py-8 text-red-500 font-semibold">
                <p>激活武器数不足，请至少激活 ${numPlayers} 种武器！</p>
            </div>
        `;
        return;
    }

    const playerNames = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    const fragment = document.createDocumentFragment();

    results.forEach((result, index) => {
        const card = document.createElement('div');
        card.className = 'multi-result-card';
        card.style.animationDelay = `${index * 0.1}s`;

        const playerName = playerNames[result.playerNumber - 1] || `玩家 ${result.playerNumber}`;

        card.innerHTML = `
            <h4 class="text-zinc-700">${playerName}</h4>
            <div class="weapon-name" style="color: ${result.weapon.color};">${result.weapon.name}</div>
            <div class="weapon-flavor text-zinc-500">${result.weapon.flavor}</div>
            <div class="challenges-section mt-2 pt-2 border-t border-zinc-200">
                <h5 class="text-sm font-bold text-zinc-500 tracking-wider">进阶挑战</h5>
                <ul class="challenges-list">
                    ${result.challenges.map(challenge => `<li>${challenge}</li>`).join('')}
                </ul>
            </div>
        `;
        fragment.appendChild(card);
    });

    containerEl.appendChild(fragment);
}
