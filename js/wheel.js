import { weaponIcons } from './utils.js';

// --- 轮盘常量 ---
const CANVAS_CENTER = 250;
const WHEEL_RADIUS = 248;
const ICON_TEXT_OFFSET = 225;
const ICON_SIZE = 40;

// --- 轮盘核心状态 ---
const state = {
    rotation: 0,
    spinSpeed: 0,
    isSpinning: false,
    highlightedSectorIndex: undefined,
};
let highlightSectorTimeout = null;

// --- 性能优化：缓存计算结果 ---
let cachedNumWeapons = 0;
let cachedAngleStep = 0;

/**
 * 计算角度步长并缓存结果
 * @param {number} numWeapons - 武器数量
 * @returns {number} 角度步长
 */
function getAngleStep(numWeapons) {
    if (numWeapons !== cachedNumWeapons) {
        cachedNumWeapons = numWeapons;
        cachedAngleStep = (2 * Math.PI) / numWeapons;
    }
    return cachedAngleStep;
}

// --- 状态 Getters/Setters ---
export function getRotation() { return state.rotation; }
export function setRotation(newRotation) { state.rotation = newRotation; }
export function getSpinSpeed() { return state.spinSpeed; }
export function setSpinSpeed(newSpeed) { state.spinSpeed = newSpeed; }
export function getIsSpinning() { return state.isSpinning; }
export function setIsSpinning(spinning) { state.isSpinning = spinning; }
export function getHighlightedSectorIndex() { return state.highlightedSectorIndex; }
export function setHighlightedSectorIndex(index) { state.highlightedSectorIndex = index; }

export function clearHighlightTimeout() {
    if (highlightSectorTimeout) {
        clearTimeout(highlightSectorTimeout);
        highlightSectorTimeout = null;
    }
}
export function setHighlightTimeout(callback, delay) {
    clearHighlightTimeout();
    highlightSectorTimeout = setTimeout(callback, delay);
}

// --- 核心绘制与逻辑函数 ---

/**
 * 绘制轮盘
 * @param {CanvasRenderingContext2D} ctx - Canvas绘图上下文
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {Array} activeWeapons - 当前激活的武器列表
 */
export function drawWheel(ctx, canvas, activeWeapons) {
    const numWeapons = activeWeapons.length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 处理没有武器的情况
    if (numWeapons === 0) {
        ctx.fillStyle = '#e4e4e7';
        ctx.beginPath();
        ctx.arc(CANVAS_CENTER, CANVAS_CENTER, WHEEL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '24px "Noto Sans SC"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('请至少选择一种武器！', CANVAS_CENTER, CANVAS_CENTER);
        return;
    }
    
    const angleStep = getAngleStep(numWeapons);
    
    ctx.save();
    ctx.translate(CANVAS_CENTER, CANVAS_CENTER);
    ctx.rotate(state.rotation);

    // 1. 绘制扇区背景色
    activeWeapons.forEach((weapon, i) => {
        ctx.fillStyle = weapon.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, WHEEL_RADIUS, i * angleStep, (i + 1) * angleStep);
        ctx.closePath();
        ctx.fill();
    });

    // 2. 绘制武器图标或文字
    activeWeapons.forEach((weapon, i) => {
        ctx.save();
        ctx.rotate(i * angleStep + angleStep / 2);
        
        const icon = weaponIcons[weapon.name];
        if (icon) { // 图标加载成功
            ctx.drawImage(icon, ICON_TEXT_OFFSET - ICON_SIZE, -ICON_SIZE / 2, ICON_SIZE, ICON_SIZE);
        } else { // 图标加载中或失败，回退到绘制文字
            ctx.fillStyle = 'white';
            ctx.font = 'bold 22px "Noto Sans SC"';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 4;
            ctx.fillText(weapon.name, ICON_TEXT_OFFSET, 0);
        }
        ctx.restore();
    });
    
    // 3. 绘制选中扇区高亮效果
    if (state.highlightedSectorIndex !== undefined && !state.isSpinning) {
        const i = state.highlightedSectorIndex;
        ctx.save();
        ctx.rotate(i * angleStep);
        ctx.fillStyle = activeWeapons[i].color + '80'; // 50% 透明度
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, WHEEL_RADIUS, 0, angleStep);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    ctx.restore();
}