// --- 音效模块 ---

// 延迟加载Tone.js以提高初始加载性能
let toneModule = null;
let isToneLoading = false;
let toneLoadPromise = null;

/**
 * 动态加载Tone.js模块
 * @returns {Promise} Tone.js模块加载Promise
 */
function loadToneModule() {
    if (toneModule) {
        return Promise.resolve(toneModule);
    }
    
    if (isToneLoading) {
        return toneLoadPromise;
    }
    
    isToneLoading = true;
    toneLoadPromise = import('https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js')
        .then(module => {
            toneModule = module;
            isToneLoading = false;
            console.log('Tone.js loaded successfully');
            return module;
        })
        .catch(error => {
            console.warn('Failed to load Tone.js, using dummy synths:', error);
            toneModule = null;
            isToneLoading = false;
            return null;
        });
    
    return toneLoadPromise;
}

/**
 * 创建合成器实例
 * @param {Object} module - Tone.js模块
 * @returns {Object} 合成器对象
 */
function createSynth(module) {
    if (!module || !module.Synth) {
        return {
            triggerAttackRelease: function() {
                // 静默失败，不执行任何操作
            },
            toDestination: function() {
                return this;
            }
        };
    }
    
    try {
        return new module.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 }
        }).toDestination();
    } catch (e) {
        console.warn('Failed to create synth, using dummy:', e);
        return {
            triggerAttackRelease: function() {
                // 静默失败，不执行任何操作
            },
            toDestination: function() {
                return this;
            }
        };
    }
}

/**
 * 创建pluck合成器实例
 * @param {Object} module - Tone.js模块
 * @returns {Object} Pluck合成器对象
 */
function createPluckSynth(module) {
    if (!module || !module.PluckSynth) {
        return {
            triggerAttackRelease: function() {
                // 静默失败，不执行任何操作
            },
            toDestination: function() {
                return this;
            }
        };
    }
    
    try {
        return new module.PluckSynth({
            attackNoise: 0.5,
            dampening: 4000,
            resonance: 0.7
        }).toDestination();
    } catch (e) {
        console.warn('Failed to create pluck synth, using dummy:', e);
        return {
            triggerAttackRelease: function() {
                // 静默失败，不执行任何操作
            },
            toDestination: function() {
                return this;
            }
        };
    }
}

// 延迟创建合成器实例
let synth = null;
let metalSynth = null;

// 初始化函数
export async function initSound() {
    try {
        const module = await loadToneModule();
        if (module) {
            synth = createSynth(module);
            metalSynth = createPluckSynth(module);
        } else {
            // 如果Tone.js加载失败，创建虚拟对象
            synth = createSynth(null);
            metalSynth = createPluckSynth(null);
        }
    } catch (e) {
        console.error('Sound initialization failed:', e);
        synth = createSynth(null);
        metalSynth = createPluckSynth(null);
    }
}

// 导出getter函数，确保在使用前已初始化
export function getSynth() {
    return synth || createSynth(null);
}

export function getMetalSynth() {
    return metalSynth || createPluckSynth(null);
}

// 为了向后兼容，如果需要立即使用，创建虚拟对象
if (!synth) {
    synth = createSynth(null);
}
if (!metalSynth) {
    metalSynth = createPluckSynth(null);
}

// 立即开始加载Tone.js
initSound();