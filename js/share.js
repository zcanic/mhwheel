// share.js - 分享功能模块
// 设计原则：独立模块，不依赖其他业务逻辑，便于维护

/**
 * 分享配置常量
 */
const SHARE_CONFIG = {
    // 画布尺寸 - 正方形，适合社交媒体
    CANVAS_SIZE: 800,
    // 内容区域边距 - 合理的边距确保内容不贴边
    PADDING: 40,
    // 元素间距 - 精确控制各元素间的距离
    SPACING: {
        titleToCards: 60,    // 标题到卡片区域
        cardGap: 16,        // 卡片之间的间距
        cardToTeam: 40,     // 卡片到团队挑战区域
        teamToFooter: 60    // 团队挑战到页脚
    },
    // 卡片尺寸配置
    CARD: {
        width: 340,         // 卡片宽度
        height: 200,        // 卡片高度 
        radius: 12,         // 圆角半径
        iconSize: 64,       // 武器图标尺寸
        padding: 20         // 卡片内边距
    },
    // 颜色配置 - 参考附件设计，更加柔和协调
    COLORS: {
        background: '#ffffff',      // 纯白背景
        primary: '#18181b',         // zinc-900，更深沉的主色
        secondary: '#71717a',       // zinc-500，中性灰色
        text: '#09090b',            // zinc-950，深色文字
        border: '#e4e4e7',         // zinc-200，淡边框
        accent: '#22c55e',          // green-500，绿色强调（参考"分配武器"按钮）
        purple: '#a855f7',          // purple-500，紫色强调（参考"分享结果"按钮但降低饱和度）
        muted: '#a1a1aa',          // zinc-400，次要信息
        cardBg: '#f4f4f5',         // zinc-100，卡片背景
        lightBg: '#fafafa'         // zinc-50，浅色背景区域
    },
    // 字体配置
    FONTS: {
        title: 'bold 32px "Noto Sans SC", sans-serif',
        subtitle: '24px "Noto Sans SC", sans-serif',
        playerName: 'bold 20px "Noto Sans SC", sans-serif',
        weaponName: 'bold 28px "Noto Sans SC", sans-serif',
        challenge: '16px "Noto Sans SC", sans-serif',
        footer: '14px "Noto Sans SC", sans-serif'
    }
};

/**
 * 分享图片生成器类
 */
export class ShareImageGenerator {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.weaponIconCache = new Map();
    }

    /**
     * 初始化Canvas
     * @private
     */
    _initCanvas() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = SHARE_CONFIG.CANVAS_SIZE;
            this.canvas.height = SHARE_CONFIG.CANVAS_SIZE;
            this.ctx = this.canvas.getContext('2d');
            
            // 启用抗锯齿
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
        }
    }

    /**
     * 预加载武器图标
     * @param {Array} weapons - 武器数组
     * @returns {Promise} 加载完成的Promise
     */
    async preloadWeaponIcons(weapons) {
        const promises = weapons.map(weapon => this._loadWeaponIcon(weapon));
        await Promise.allSettled(promises);
    }

    /**
     * 加载单个武器图标
     * @param {Object} weapon - 武器对象
     * @returns {Promise<Image|null>}
     * @private
     */
    _loadWeaponIcon(weapon) {
        return new Promise((resolve) => {
            if (this.weaponIconCache.has(weapon.name)) {
                resolve(this.weaponIconCache.get(weapon.name));
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous'; // 处理跨域问题
            
            img.onload = () => {
                this.weaponIconCache.set(weapon.name, img);
                resolve(img);
            };
            
            img.onerror = () => {
                console.warn(`Failed to load weapon icon: ${weapon.name}`);
                this.weaponIconCache.set(weapon.name, null);
                resolve(null);
            };
            
            img.src = weapon.icon;
        });
    }

    /**
     * 生成多人模式分享图片 - 完全重构布局逻辑
     * @param {Object} shareData - 分享数据
     * @returns {Promise<Blob>} 图片Blob对象
     */
    async generateMultiplayerShareImage(shareData) {
        this._initCanvas();
        const ctx = this.ctx;
        const size = SHARE_CONFIG.CANVAS_SIZE;

        // 清空画布并设置白色背景
        ctx.fillStyle = SHARE_CONFIG.COLORS.background;
        ctx.fillRect(0, 0, size, size);

        // 预加载图标
        await this.preloadWeaponIcons(shareData.players.map(p => p.weapon).filter(Boolean));

        // 精确的布局计算
        let currentY = SHARE_CONFIG.PADDING;

        // 1. 绘制标题
        currentY = this._drawCenteredTitle(ctx, '多人武器分配', currentY);
        
        // 2. 绘制玩家卡片区域（2x2网格）
        currentY = this._drawPlayerCardsGrid(ctx, shareData.players, currentY + SHARE_CONFIG.SPACING.titleToCards);
        
        // 3. 绘制团队挑战（如果有）
        if (shareData.teamChallenge) {
            currentY = this._drawTeamChallengeSection(ctx, shareData.teamChallenge, currentY + SHARE_CONFIG.SPACING.cardToTeam);
        }
        
        // 4. 绘制页脚
        this._drawCenteredFooter(ctx);

        // 转换为Blob
        return new Promise((resolve) => {
            this.canvas.toBlob(resolve, 'image/png', 0.95);
        });
    }

    /**
     * 绘制居中标题
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} title 
     * @param {number} y 
     * @returns {number} 新的Y位置
     * @private
     */
    _drawCenteredTitle(ctx, title, y) {
        ctx.fillStyle = SHARE_CONFIG.COLORS.primary;
        ctx.font = 'bold 32px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const centerX = SHARE_CONFIG.CANVAS_SIZE / 2;
        ctx.fillText(title, centerX, y);
        
        return y + 45; // 标题高度
    }

    /**
     * 绘制玩家卡片网格 - 精确的2x2布局
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Array} players 
     * @param {number} startY 
     * @returns {number} 新的Y位置
     * @private
     */
    _drawPlayerCardsGrid(ctx, players, startY) {
        const playersWithWeapons = players.filter(p => p.weapon);
        const { CANVAS_SIZE, PADDING, CARD, SPACING } = SHARE_CONFIG;
        
        // 计算网格布局
        const totalWidth = CANVAS_SIZE - (PADDING * 2);
        const cardWidth = CARD.width;
        const cardHeight = CARD.height;
        const gap = SPACING.cardGap;
        
        // 居中计算 - 确保2x2网格在画布中心
        const gridWidth = (cardWidth * 2) + gap;
        const startX = (CANVAS_SIZE - gridWidth) / 2;
        
        // 绘制最多4个玩家卡片
        const maxPlayers = Math.min(playersWithWeapons.length, 4);
        let maxY = startY;
        
        for (let i = 0; i < maxPlayers; i++) {
            const player = playersWithWeapons[i];
            const row = Math.floor(i / 2);
            const col = i % 2;
            
            const x = startX + col * (cardWidth + gap);
            const y = startY + row * (cardHeight + gap);
            
            this._drawPlayerCard(ctx, player, x, y, cardWidth, cardHeight);
            
            maxY = Math.max(maxY, y + cardHeight);
        }
        
        return maxY;
    }

    /**
     * 绘制单个玩家卡片 - 完全重写以匹配附件设计
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} player 
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @param {number} height 
     * @private
     */
    _drawPlayerCard(ctx, player, x, y, width, height) {
        const { CARD, COLORS } = SHARE_CONFIG;
        
        // 1. 绘制卡片背景
        ctx.fillStyle = COLORS.background;
        this._roundRect(ctx, x, y, width, height, CARD.radius);
        ctx.fill();
        
        // 2. 绘制卡片边框
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 3. 绘制删除按钮装饰（右上角）
        ctx.fillStyle = COLORS.muted;
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', x + width - 20, y + 20);
        
        // 4. 绘制玩家名称（左上角）
        ctx.fillStyle = COLORS.secondary;
        ctx.font = '16px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(player.name || '玩家', x + CARD.padding, y + CARD.padding);
        
        // 5. 绘制武器图标（居中上方）
        const iconSize = CARD.iconSize;
        const iconX = x + (width - iconSize) / 2;
        const iconY = y + 50;
        
        const weaponIcon = this.weaponIconCache.get(player.weapon.name);
        if (weaponIcon) {
            ctx.drawImage(weaponIcon, iconX, iconY, iconSize, iconSize);
        } else {
            // 占位符
            ctx.fillStyle = COLORS.border;
            ctx.fillRect(iconX, iconY, iconSize, iconSize);
            ctx.fillStyle = COLORS.secondary;
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚔️', iconX + iconSize/2, iconY + iconSize/2);
        }
        
        // 6. 绘制武器名称（彩色，居中）
        ctx.fillStyle = this._getWeaponColor(player.weapon.name);
        ctx.font = 'bold 24px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(player.weapon.name, x + width/2, iconY + iconSize + 12);
        
        // 7. 绘制个人挑战（如果有空间）
        if (player.challenge) {
            const challengeY = iconY + iconSize + 50;
            const availableHeight = y + height - challengeY - 30;
            
            if (availableHeight > 20) {
                ctx.fillStyle = COLORS.muted;
                ctx.font = '12px "Noto Sans SC", sans-serif';
                ctx.textAlign = 'left';
                
                // 文本换行
                const maxWidth = width - (CARD.padding * 2);
                const lines = this._wrapText(ctx, `个人挑战: ${player.challenge}`, maxWidth);
                
                for (let i = 0; i < Math.min(lines.length, 2); i++) {
                    ctx.fillText(lines[i], x + CARD.padding, challengeY + i * 16);
                }
            }
        }
        
        // 8. 绘制重roll提示（底部居中）
        ctx.fillStyle = COLORS.purple;
        ctx.font = '12px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('重roll (1)', x + width/2, y + height - 10);
    }

    /**
     * 获取武器对应的颜色
     * @param {string} weaponName 
     * @returns {string}
     * @private
     */
    _getWeaponColor(weaponName) {
        const colorMap = {
            '大剑': '#ef4444',      // red-500
            '操虫棍': '#a855f7',    // purple-500  
            '狩猎笛': '#06b6d4',    // cyan-500
            '盾斧': '#8b5cf6'       // violet-500
        };
        return colorMap[weaponName] || SHARE_CONFIG.COLORS.primary;
    }

    /**
     * 绘制圆角矩形路径
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @param {number} height 
     * @param {number} radius 
     * @private
     */
    _roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * 绘制团队挑战区域 - 参考附件设计
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} teamChallenge 
     * @param {number} y 
     * @returns {number} 新的Y位置
     * @private
     */
    _drawTeamChallengeSection(ctx, teamChallenge, y) {
        const { CANVAS_SIZE, PADDING, COLORS } = SHARE_CONFIG;
        const sectionWidth = CANVAS_SIZE - (PADDING * 2);
        const sectionHeight = 80;
        const x = PADDING;
        
        // 绘制团队挑战背景卡片
        ctx.fillStyle = COLORS.cardBg;
        this._roundRect(ctx, x, y, sectionWidth, sectionHeight, 12);
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 绘制图标和标题
        ctx.fillStyle = COLORS.accent;
        ctx.font = 'bold 20px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('📋 团队挑战', x + 20, y + 15);
        
        // 绘制挑战内容
        ctx.fillStyle = COLORS.text;
        ctx.font = '16px "Noto Sans SC", sans-serif';
        
        const challengeText = teamChallenge;
        const maxWidth = sectionWidth - 40;
        const lines = this._wrapText(ctx, challengeText, maxWidth);
        
        let textY = y + 45;
        for (let i = 0; i < Math.min(lines.length, 2); i++) {
            ctx.fillText(lines[i], x + 20, textY + i * 20);
        }
        
        return y + sectionHeight;
    }

    /**
     * 绘制居中页脚
     * @param {CanvasRenderingContext2D} ctx 
     * @private
     */
    _drawCenteredFooter(ctx) {
        const { CANVAS_SIZE, PADDING, COLORS } = SHARE_CONFIG;
        const y = CANVAS_SIZE - PADDING - 15;
        
        ctx.fillStyle = COLORS.muted;
        ctx.font = '14px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        const centerX = CANVAS_SIZE / 2;
        ctx.fillText('Monster Hunter 武器转盘', centerX, y);
    }

    /**
     * 绘制玩家信息
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} player 
     * @param {number} y 
     * @returns {number} 新的Y位置
     * @private
     */
    _drawPlayerInfo(ctx, player, y) {
        const padding = SHARE_CONFIG.PADDING;
        const iconSize = 40;
        
        // 绘制武器图标
        const weaponIcon = this.weaponIconCache.get(player.weapon.name);
        if (weaponIcon) {
            ctx.drawImage(weaponIcon, padding, y, iconSize, iconSize);
        } else {
            // 如果图标加载失败，绘制占位符
            ctx.fillStyle = SHARE_CONFIG.COLORS.border;
            ctx.fillRect(padding, y, iconSize, iconSize);
            ctx.fillStyle = SHARE_CONFIG.COLORS.secondary;
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚔️', padding + iconSize/2, y + iconSize/2);
        }
        
        // 绘制玩家名称
        ctx.fillStyle = SHARE_CONFIG.COLORS.text;
        ctx.font = SHARE_CONFIG.FONTS.playerName;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(player.name, padding + iconSize + 15, y);
        
        // 绘制武器名称（带颜色）
        ctx.fillStyle = player.weapon.color || SHARE_CONFIG.COLORS.primary;
        ctx.font = SHARE_CONFIG.FONTS.weaponName;
        ctx.fillText(player.weapon.name, padding + iconSize + 15, y + 25);
        
        // 绘制挑战
        if (player.challenge) {
            ctx.fillStyle = SHARE_CONFIG.COLORS.secondary;
            ctx.font = SHARE_CONFIG.FONTS.challenge;
            const challengeText = `挑战: ${player.challenge}`;
            ctx.fillText(challengeText, padding + iconSize + 15, y + 58);
        }
        
        return y + 90;
    }

    /**
     * 绘制团队挑战
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} teamChallenge 
     * @param {number} y 
     * @returns {number} 新的Y位置
     * @private
     */
    _drawTeamChallenge(ctx, teamChallenge, y) {
        const padding = SHARE_CONFIG.PADDING;
        
        // 绘制标题
        ctx.fillStyle = SHARE_CONFIG.COLORS.accent;
        ctx.font = SHARE_CONFIG.FONTS.subtitle;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('📋 团队挑战', padding, y);
        
        // 绘制挑战内容
        ctx.fillStyle = SHARE_CONFIG.COLORS.text;
        ctx.font = SHARE_CONFIG.FONTS.challenge;
        const challengeText = this._wrapText(ctx, teamChallenge, SHARE_CONFIG.CANVAS_SIZE - padding * 2);
        
        let textY = y + 35;
        for (const line of challengeText) {
            ctx.fillText(line, padding, textY);
            textY += 20;
        }
        
        return textY + 20;
    }

    /**
     * 绘制页脚
     * @param {CanvasRenderingContext2D} ctx 
     * @private
     */
    _drawFooter(ctx) {
        const padding = SHARE_CONFIG.PADDING;
        const footerY = SHARE_CONFIG.CANVAS_SIZE - padding - 20;
        
        ctx.fillStyle = SHARE_CONFIG.COLORS.secondary;
        ctx.font = SHARE_CONFIG.FONTS.footer;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        const centerX = SHARE_CONFIG.CANVAS_SIZE / 2;
        const currentDate = new Date().toLocaleDateString('zh-CN');
        ctx.fillText(`🌐 猎人命运轮盘 - ${currentDate}`, centerX, footerY);
    }

    /**
     * 文字换行处理
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {number} maxWidth 
     * @returns {Array<string>} 换行后的文本数组
     * @private
     */
    _wrapText(ctx, text, maxWidth) {
        const words = text.split('');
        const lines = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i];
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && i > 0) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        return lines;
    }
}

/**
 * 分享功能主控制器
 */
export class ShareController {
    constructor() {
        this.generator = new ShareImageGenerator();
        this.isSharing = false;
        this.shareButton = null;
        this.initialized = false;
    }

    /**
     * 初始化分享控制器（绑定DOM和事件）
     * @param {Function} getAppState - 获取应用状态的函数
     */
    init(getAppState) {
        if (this.initialized) return;
        
        this.getAppState = getAppState;
        this.shareButton = document.getElementById('shareResultsBtn');
        
        if (this.shareButton) {
            // 绑定方法引用以便后续正确移除
            this._boundHandleShare = () => this.handleShare();
            this.shareButton.addEventListener('click', this._boundHandleShare);
        }
        
        this.initialized = true;
    }

    /**
     * 处理分享按钮点击
     */
    async handleShare() {
        if (!this.getAppState) {
            console.error('ShareController not properly initialized');
            return;
        }

        const appState = this.getAppState();
        const validPlayers = appState.multiplayer.players.filter(p => p.name && p.name.trim() !== '');
        const playersWithWeapons = appState.multiplayer.players.filter(p => p.weapon);
        
        if (validPlayers.length === 0) {
            this._showMessage('请先添加玩家！', 'error');
            return;
        }
        
        if (playersWithWeapons.length === 0) {
            this._showMessage('请先分配武器再分享！', 'error');
            return;
        }
        
        const shareData = {
            players: playersWithWeapons,
            teamChallenge: appState.multiplayer.teamChallenge
        };
        
        await this.share(shareData);
    }

    /**
     * 更新分享按钮状态 - 简化为一直显示
     * @param {Object} appState - 应用状态
     */
    updateUI(appState) {
        if (!this.shareButton || !appState.multiplayer) return;
        
        // 简化逻辑：分享按钮一直显示，只是根据状态调整可用性和文本
        const validPlayers = appState.multiplayer.players.filter(p => p.name && p.name.trim() !== '');
        const playersWithWeapons = validPlayers.filter(p => p.weapon);
        const hasResults = playersWithWeapons.length > 0;
        const isSharing = this.isSharing;
        const isAssigning = appState.multiplayer.isAssigning;
        
        // 按钮始终显示，不再隐藏
        this.shareButton.classList.remove('hidden');
        
        // 根据状态设置可用性
        this.shareButton.disabled = isSharing || isAssigning || !hasResults;
        this.shareButton.classList.toggle('loading', isSharing);
        
        // 根据状态设置按钮文本
        if (isSharing) {
            this.shareButton.textContent = '分享中...';
        } else if (isAssigning) {
            this.shareButton.textContent = '📸 分享结果';
        } else if (!hasResults) {
            this.shareButton.textContent = '📸 分享结果';
        } else {
            this.shareButton.textContent = '📸 分享结果';
        }
    }

    /**
     * 执行分享操作
     * @param {Object} shareData - 分享数据
     * @returns {Promise<boolean>} 分享是否成功
     */
    async share(shareData) {
        if (this.isSharing) {
            console.warn('Share operation already in progress');
            return false;
        }

        this.isSharing = true;
        this.updateUI(this.getAppState ? this.getAppState() : {multiplayer: {players: [], isAssigning: false}});
        
        try {
            // 生成图片
            const blob = await this.generator.generateMultiplayerShareImage(shareData);
            
            // 尝试分享策略：剪贴板 -> 下载
            const success = await this._tryShare(blob);
            return success;
            
        } catch (error) {
            console.error('Share failed:', error);
            this._showMessage('分享失败，请稍后重试', 'error');
            return false;
            
        } finally {
            this.isSharing = false;
            this.updateUI(this.getAppState ? this.getAppState() : {multiplayer: {players: [], isAssigning: false}});
        }
    }

    /**
     * 尝试各种分享方式 - 增加移动端原生分享支持
     * @param {Blob} blob - 图片Blob
     * @returns {Promise<boolean>} 是否成功
     * @private
     */
    async _tryShare(blob) {
        // 策略1: 移动端原生分享API (iOS/Android)
        if (this._isNativeShareSupported()) {
            try {
                await this._shareWithNativeAPI(blob);
                this._showMessage('已调用原生分享！', 'success');
                return true;
            } catch (error) {
                console.warn('Native share failed, trying other methods:', error);
            }
        }

        // 策略2: 剪贴板API (桌面端)
        if (this._isClipboardSupported()) {
            try {
                await this._shareToClipboard(blob);
                this._showMessage('结果已复制到剪贴板！', 'success');
                return true;
            } catch (error) {
                console.warn('Clipboard share failed, falling back to download:', error);
            }
        }

        // 策略3: 降级到下载
        try {
            await this._downloadImage(blob);
            this._showMessage('图片已保存，可手动分享！', 'success');
            return true;
        } catch (error) {
            console.error('Download failed:', error);
            this._showMessage('保存失败，请手动截屏分享', 'error');
            return false;
        }
    }

    /**
     * 检查移动端原生分享API支持
     * @returns {boolean}
     * @private
     */
    _isNativeShareSupported() {
        return (
            navigator.share && 
            navigator.canShare &&
            this._isMobileDevice()
        );
    }

    /**
     * 检测是否为移动设备
     * @returns {boolean}
     * @private
     */
    _isMobileDevice() {
        return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform));
    }

    /**
     * 使用原生分享API分享图片 - iOS/Android原生支持
     * @param {Blob} blob - 图片Blob
     * @private
     */
    async _shareWithNativeAPI(blob) {
        // 创建File对象，原生分享API需要File而不是Blob
        const file = new File([blob], `猎人小队-${Date.now()}.png`, {
            type: 'image/png'
        });

        // 检查是否支持分享文件
        const shareData = {
            title: 'Monster Hunter 武器分配结果',
            text: '来看看我们的猎人小队武器分配！',
            files: [file]
        };

        if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            // 如果不支持文件分享，则只分享文本和URL
            await navigator.share({
                title: 'Monster Hunter 武器分配结果',
                text: '来看看我们的猎人小队武器分配！快来试试这个武器转盘吧！',
                url: window.location.href
            });
            
            // 同时下载图片供用户手动分享
            await this._downloadImage(blob);
        }
    }

    /**
     * 检查剪贴板API支持
     * @returns {boolean}
     * @private
     */
    _isClipboardSupported() {
        return (
            navigator.clipboard &&
            window.isSecureContext &&
            typeof ClipboardItem !== 'undefined'
        );
    }

    /**
     * 复制到剪贴板
     * @param {Blob} blob - 图片Blob
     * @private
     */
    async _shareToClipboard(blob) {
        const clipboardItem = new ClipboardItem({
            [blob.type]: blob
        });
        await navigator.clipboard.write([clipboardItem]);
    }

    /**
     * 下载图片
     * @param {Blob} blob - 图片Blob
     * @private
     */
    async _downloadImage(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `猎人小队-${new Date().toISOString().split('T')[0]}.png`;
        
        // 兼容性处理
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理URL对象
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * 显示消息提示 - 更优雅协调的设计
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 ('success' | 'error' | 'info')
     * @private
     */
    _showMessage(message, type = 'info') {
        // 创建符合项目zinc色系的提示元素
        const toast = document.createElement('div');
        toast.className = `share-toast share-toast-${type}`;
        toast.textContent = message;
        
        // 使用项目统一的zinc色系设计
        Object.assign(toast.style, {
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-10px) scale(0.95)',
            padding: '12px 20px',
            borderRadius: '8px', // 稍小的圆角，更精致
            color: 'white',
            fontWeight: '500',
            fontFamily: '"Noto Sans SC", sans-serif',
            fontSize: '14px',
            zIndex: '10000',
            backgroundColor: type === 'success' 
                ? '#22c55e'  // green-500
                : type === 'error' 
                ? '#ef4444'  // red-500
                : '#71717a', // zinc-500 - 更协调的默认色
            boxShadow: type === 'success' 
                ? '0 4px 20px rgba(34, 197, 94, 0.2)' 
                : type === 'error' 
                ? '0 4px 20px rgba(239, 68, 68, 0.2)'
                : '0 4px 20px rgba(113, 113, 122, 0.2)', // zinc阴影
            border: 'none',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            opacity: '0'
        });
        
        document.body.appendChild(toast);
        
        // 入场动画 - 更有生命力的动画
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        });
        
        // 3.5秒后优雅退出
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(-10px) scale(0.95)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }
        }, 3500); // 稍微延长显示时间，让用户有足够时间阅读
    }

    /**
     * 获取分享状态
     * @returns {boolean} 是否正在分享
     */
    getShareStatus() {
        return this.isSharing;
    }

    /**
     * 销毁分享控制器
     */
    destroy() {
        if (this.shareButton) {
            // 创建一个绑定的方法引用来正确移除事件监听器
            this.shareButton.removeEventListener('click', this._boundHandleShare);
        }
        this.initialized = false;
        this.shareButton = null;
        this.getAppState = null;
    }
}
