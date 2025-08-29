import { weapons } from './data.js';

/**
 * 根据激活的武器列表，更新武器选择器中所有按钮的UI状态
 * @param {Array<string>} activeWeaponNames - 当前激活武器的名称数组
 */
export function updateWeaponSelectorUI(activeWeaponNames) {
    const buttons = document.querySelectorAll('.weapon-btn[data-weapon-name]');
    buttons.forEach(button => {
        const weaponName = button.dataset.weaponName;
        const isActive = activeWeaponNames.includes(weaponName);
        
        button.classList.toggle('active', isActive);
        button.classList.toggle('inactive', !isActive);

        const icon = button.querySelector('.weapon-icon-selector');
        if (icon) {
            const scale = isActive ? 'scale(1.1)' : 'scale(1)';
            if (icon.style.transform !== scale) {
                icon.style.transform = scale;
            }
        }
    });
}

/**
 * 初始化武器选择器，创建所有武器按钮并绑定事件
 * @param {HTMLElement} weaponSelector - 用于容纳按钮的DOM元素
 * @param {Function} onWeaponToggle - 当按钮被点击时调用的回调函数
 */
export function setupSelector(weaponSelector, onWeaponToggle) {
    if (!weaponSelector) return;

    weaponSelector.innerHTML = '';
    const fragment = document.createDocumentFragment();

    weapons.forEach((weapon, i) => {
        const button = document.createElement('button');
        button.id = `weapon-btn-${i}`;
        // 初始状态设为inactive，由updateWeaponSelectorUI统一更新
        button.className = 'weapon-btn inactive p-2 rounded-lg border-2 font-semibold text-sm flex items-center justify-center';
        button.dataset.weaponName = weapon.name;

        if (weapon.icon) {
            const iconDiv = document.createElement('div');
            iconDiv.className = 'weapon-icon-selector';
            iconDiv.style.backgroundImage = `url('${weapon.icon}')`;
            iconDiv.addEventListener('error', (e) => {
                console.warn(`Failed to load icon for ${weapon.name}`);
                e.target.style.backgroundImage = 'none';
                e.target.textContent = '⚠️';
            });
            button.appendChild(iconDiv);
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = weapon.name;
        button.appendChild(textSpan);

        button.addEventListener('click', () => {
            // 只调用回调，不直接修改UI
            if (onWeaponToggle) {
                onWeaponToggle(weapon.name);
            }
        });

        fragment.appendChild(button);
    });

    weaponSelector.appendChild(fragment);
}