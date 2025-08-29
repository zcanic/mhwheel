// 对象用于存储预加载的武器图标
export const weaponIcons = {};

// 图片加载状态跟踪
const imageLoadStatus = new Map();
let totalIcons = 0;
let loadedCount = 0;

/**
 * 预加载武器图标（支持渐进式加载）
 * @param {Array} weapons - 武器数据数组
 * @param {Function} onProgress - 单个图标加载完成后的回调函数
 * @param {Function} onAllLoaded - 所有图标加载完成后的回调函数
 */
export function preloadWeaponIcons(weapons, onProgress, onAllLoaded) {
    // 重置状态
    imageLoadStatus.clear();
    loadedCount = 0;
    totalIcons = weapons.filter(w => w.icon).length;
    
    // 如果没有需要预加载的图标，则直接回调
    if (totalIcons === 0) {
        if (onAllLoaded) onAllLoaded();
        return;
    }
    
    // 优先加载前6个图标（2行3列的网格），其余的延迟加载
    const priorityWeapons = weapons.slice(0, 6);
    const remainingWeapons = weapons.slice(6);
    
    // 加载优先级图标
    loadWeaponIcons(priorityWeapons, onProgress, () => {
        // 优先级图标加载完成后，再加载剩余图标
        if (remainingWeapons.length > 0) {
            setTimeout(() => {
                loadWeaponIcons(remainingWeapons, onProgress, onAllLoaded);
            }, 100); // 延迟加载，避免阻塞主线程
        } else if (onAllLoaded) {
            onAllLoaded();
        }
    });
}

/**
 * 加载指定武器的图标
 * @param {Array} weapons - 武器数据数组
 * @param {Function} onProgress - 单个图标加载完成后的回调函数
 * @param {Function} onComplete - 所有图标加载完成后的回调函数
 */
function loadWeaponIcons(weapons, onProgress, onComplete) {
    let completed = 0;
    const totalCount = weapons.filter(w => w.icon).length;
    
    if (totalCount === 0) {
        if (onComplete) onComplete();
        return;
    }
    
    weapons.forEach(weapon => {
        if (weapon.icon) {
            // 检查是否已经加载过
            if (imageLoadStatus.has(weapon.icon)) {
                completed++;
                if (completed === totalCount && onComplete) {
                    onComplete();
                }
                return;
            }
            
            const img = new Image();
            imageLoadStatus.set(weapon.icon, 'loading');
            
            img.onload = function() {
                weaponIcons[weapon.name] = img;
                imageLoadStatus.set(weapon.icon, 'loaded');
                loadedCount++;
                completed++;
                
                if (onProgress) onProgress(weapon.name, loadedCount, totalIcons);
                
                if (completed === totalCount && onComplete) {
                    onComplete();
                }
            };
            
            img.onerror = function(e) {
                console.warn(`Failed to load icon for ${weapon.name}:`, e);
                weaponIcons[weapon.name] = null; // 使用null作为加载失败的标记
                imageLoadStatus.set(weapon.icon, 'error');
                loadedCount++;
                completed++;
                
                if (onProgress) onProgress(weapon.name, loadedCount, totalIcons, true); // true表示加载失败
                
                if (completed === totalCount && onComplete) {
                    onComplete();
                }
            };
            
            // 设置图片源，开始加载
            img.src = weapon.icon;
        }
    });
}

/**
 * 获取图片加载进度
 * @returns {Object} 包含加载进度信息的对象
 */
export function getImageLoadProgress() {
    return {
        loaded: loadedCount,
        total: totalIcons,
        percentage: totalIcons > 0 ? Math.round((loadedCount / totalIcons) * 100) : 0
    };
}