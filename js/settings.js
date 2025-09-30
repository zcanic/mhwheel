// settings.js - 轻量化预设管理模块
// 设计原则：无感化、轻量级、不影响现有功能

/**
 * 预设配置常量
 */
const SETTINGS_CONFIG = {
    // localStorage键名
    STORAGE_KEY: 'mhwheel_settings',
    // 版本号，用于兼容性检查
    VERSION: '2.1.0',
    // 默认设置
    DEFAULTS: {
        activeWeaponNames: null, // null表示使用全部武器
        lastMode: 'single',
        autoSave: true,
        theme: 'auto' // 预留主题功能
    },
    // 自动保存防抖延迟（毫秒）
    SAVE_DEBOUNCE: 1000
};

/**
 * 轻量级预设管理器
 */
export class SettingsManager {
    constructor() {
        this.settings = null;
        this.saveTimeout = null;
        this.initialized = false;
        this.onStateChange = null;
    }

    /**
     * 初始化设置管理器
     * @param {Function} onStateChange - 状态变更回调函数
     * @returns {Object|null} 加载的设置或null
     */
    init(onStateChange) {
        if (this.initialized) return this.settings;
        
        this.onStateChange = onStateChange;
        this.settings = this._loadSettings();
        this.initialized = true;
        
        // 如果加载到有效设置，通知状态变更
        if (this.settings && this.onStateChange) {
            // 延迟调用，确保主应用完全初始化后再应用设置
            setTimeout(() => {
                try {
                    this.onStateChange(this.settings);
                } catch (error) {
                    console.warn('Failed to apply loaded settings:', error);
                }
            }, 100);
        }
        
        return this.settings;
    }

    /**
     * 从localStorage加载设置
     * @returns {Object|null} 设置对象或null
     * @private
     */
    _loadSettings() {
        try {
            const stored = localStorage.getItem(SETTINGS_CONFIG.STORAGE_KEY);
            if (!stored) return null;
            
            const parsed = JSON.parse(stored);
            
            // 版本兼容性检查
            if (!parsed.version || parsed.version !== SETTINGS_CONFIG.VERSION) {
                console.info('Settings version mismatch, using defaults');
                return null;
            }
            
            // 数据完整性检查
            if (!parsed.data || typeof parsed.data !== 'object') {
                console.warn('Invalid settings data format');
                return null;
            }
            
            return {
                ...SETTINGS_CONFIG.DEFAULTS,
                ...parsed.data
            };
            
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
            return null;
        }
    }

    /**
     * 保存设置到localStorage（防抖）
     * @param {Object} newSettings - 新的设置对象
     * @private
     */
    _saveSettings(newSettings) {
        // 清除之前的保存定时器
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // 防抖保存
        this.saveTimeout = setTimeout(() => {
            try {
                const dataToSave = {
                    version: SETTINGS_CONFIG.VERSION,
                    timestamp: Date.now(),
                    data: { ...newSettings }
                };
                
                localStorage.setItem(SETTINGS_CONFIG.STORAGE_KEY, JSON.stringify(dataToSave));
            } catch (error) {
                console.warn('Failed to save settings to localStorage:', error);
            }
        }, SETTINGS_CONFIG.SAVE_DEBOUNCE);
    }

    /**
     * 更新设置（无感化自动保存）
     * @param {Object} updates - 要更新的设置项
     */
    updateSettings(updates) {
        if (!this.initialized || !updates || typeof updates !== 'object') {
            return;
        }
        
        // 合并新设置
        const base = (this.settings && typeof this.settings === 'object')
            ? this.settings
            : { ...SETTINGS_CONFIG.DEFAULTS };
        this.settings = {
            ...base,
            ...updates
        };
        
        // 自动保存（如果启用）
        if (this.settings.autoSave !== false) {
            this._saveSettings(this.settings);
        }
    }

    /**
     * 获取当前设置
     * @returns {Object} 当前设置对象
     */
    getSettings() {
        return this.settings ? { ...this.settings } : { ...SETTINGS_CONFIG.DEFAULTS };
    }

    /**
     * 获取特定设置项
     * @param {string} key - 设置键名
     * @param {*} fallback - 回退值
     * @returns {*} 设置值
     */
    getSetting(key, fallback = null) {
        if (!this.settings || !(key in this.settings)) {
            return fallback !== null ? fallback : SETTINGS_CONFIG.DEFAULTS[key];
        }
        return this.settings[key];
    }

    /**
     * 重置所有设置
     */
    resetSettings() {
        this.settings = { ...SETTINGS_CONFIG.DEFAULTS };
        try {
            localStorage.removeItem(SETTINGS_CONFIG.STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to remove settings from localStorage:', error);
        }
        
        // 通知状态变更
        if (this.onStateChange) {
            this.onStateChange(this.settings);
        }
    }

    /**
     * 检查localStorage是否可用
     * @returns {boolean} 是否可用
     * @static
     */
    static isStorageAvailable() {
        try {
            const test = '__mhwheel_storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取存储使用情况（调试用）
     * @returns {Object} 存储信息
     */
    getStorageInfo() {
        try {
            const data = localStorage.getItem(SETTINGS_CONFIG.STORAGE_KEY);
            return {
                exists: !!data,
                size: data ? data.length : 0,
                sizeKB: data ? Math.round(data.length / 1024 * 100) / 100 : 0
            };
        } catch (error) {
            return { exists: false, size: 0, sizeKB: 0, error: error.message };
        }
    }

    /**
     * 销毁设置管理器
     */
    destroy() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        
        this.initialized = false;
        this.settings = null;
        this.onStateChange = null;
    }
}

/**
 * 全局设置管理器实例（单例模式）
 */
let globalSettingsManager = null;

/**
 * 获取全局设置管理器实例
 * @returns {SettingsManager} 设置管理器实例
 */
export function getSettingsManager() {
    if (!globalSettingsManager) {
        globalSettingsManager = new SettingsManager();
    }
    return globalSettingsManager;
}

/**
 * 便捷函数：获取设置项
 * @param {string} key - 设置键名
 * @param {*} fallback - 回退值
 * @returns {*} 设置值
 */
export function getSetting(key, fallback = null) {
    const manager = getSettingsManager();
    return manager.getSetting(key, fallback);
}

/**
 * 便捷函数：更新设置项
 * @param {Object} updates - 要更新的设置
 */
export function updateSettings(updates) {
    const manager = getSettingsManager();
    manager.updateSettings(updates);
}

/**
 * 便捷函数：检查存储是否可用
 * @returns {boolean} 是否可用
 */
export function isStorageAvailable() {
    return SettingsManager.isStorageAvailable();
}
