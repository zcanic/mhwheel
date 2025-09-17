// share.js - 分享功能模块 (Enhanced v2)
// 设计原则：独立模块 + 可扩展 + 优雅视觉
// 本次重构：
// 1. 全新布局：横版 1024x768，自适应玩家数，信息分层清晰
// 2. 视觉增强：柔和径向渐变 + 轻噪点 + 阴影 + 顶部色条
// 3. 文本排版：智能换行 + 行数限制 + 省略号
// 4. 剪贴板优先：生成后直接复制到剪贴板，失败再降级下载
// 5. 水印：zcanic.xyz/mhwheel

/**
 * 分享配置常量
 */
const SHARE_CONFIG = {
    // 画布尺寸 - 横版，适合多人结果分享
    CANVAS_WIDTH: 1024,
    CANVAS_HEIGHT: 768,
    // 内容区域边距 - 确保信息不贴边
    PADDING: 56,
    // 网格间距 - 精确控制各元素间的距离
    GRID_GAP: 28,
    // 玩家信息最大行数 - 超出部分省略
    PLAYER_MAX_LINES: 3,
    // 团队挑战最大行数 - 超出部分省略
    TEAM_MAX_LINES: 3,
    // 水印文本
    WATERMARK: 'zcanic.xyz/mhwheel',
    // 颜色配置 - 参考附件设计，更加柔和协调
    COLORS: {
        background: '#ffffff',      // 纯白背景
        primary: '#0f172a',         // 深色主色
        secondary: '#475569',       // 中性灰色
        text: '#0f172a',            // 深色文字
        divider: '#e2e8f0',         // 淡边框
        accent: '#3b82f6',          // 蓝色强调
        teamBg: '#f0f9ff',          // 团队挑战背景
        teamBorder: '#bae6fd',      // 团队挑战边框
        teamTitle: '#0369a1',       // 团队挑战标题
        watermark: '#94a3b8'        // 水印颜色
    },
    // 字体配置
    FONTS: {
        title: '600 40px "Noto Sans SC", sans-serif',
        playerWeapon: '600 26px "Noto Sans SC", sans-serif',
        playerName: '500 16px "Noto Sans SC", sans-serif',
        challenge: '400 14px "Noto Sans SC", sans-serif',
        teamTitle: '600 20px "Noto Sans SC", sans-serif',
        footer: '400 12px "Noto Sans SC", sans-serif'
    }
};

/**
 * 分享图片生成器类
 */
class ShareImageGenerator {
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
            this.canvas.width = SHARE_CONFIG.CANVAS_WIDTH;
            this.canvas.height = SHARE_CONFIG.CANVAS_HEIGHT;
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
        await Promise.allSettled(weapons.map(w => this._loadWeaponIcon(w)));
    }

    /**
     * 加载单个武器图标
     * @param {Object} weapon - 武器对象
     * @returns {Promise<Image|null>}
     * @private
     */
    _loadWeaponIcon(weapon) {
        return new Promise(resolve => {
            if (!weapon || !weapon.icon) return resolve(null);
            if (this.weaponIconCache.has(weapon.name)) return resolve(this.weaponIconCache.get(weapon.name));
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { this.weaponIconCache.set(weapon.name, img); resolve(img); };
            img.onerror = () => { this.weaponIconCache.set(weapon.name, null); resolve(null); };
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
        const W = SHARE_CONFIG.CANVAS_WIDTH;
        const H = SHARE_CONFIG.CANVAS_HEIGHT;

        // 背景：径向渐变 + 轻噪点
        const grad = ctx.createRadialGradient(W/2, H/2, 100, W/2, H/2, Math.max(W,H)/1.1);
        grad.addColorStop(0, SHARE_CONFIG.COLORS.bgGradientInner);
        grad.addColorStop(1, SHARE_CONFIG.COLORS.bgGradientOuter);
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,W,H);
        this._drawNoise(ctx, W, H, 1600);

        // 准备数据
        const players = shareData.players.slice(0,4); // 最多4人
        await this.preloadWeaponIcons(players.map(p => p.weapon).filter(Boolean));

        let y = SHARE_CONFIG.PADDING;
        this._drawTitle(ctx, y); y += 64; // 标题区高度
        this._drawDivider(ctx, y - 20);

        // 网格区域布局
        const gridHeightTop = 360; // 预留玩家区高度
        y = this._drawPlayersGrid(ctx, players, y, gridHeightTop);

        // 团队挑战
        if (shareData.teamChallenge) {
            y += 24;
            y = this._drawTeamChallenge(ctx, shareData.teamChallenge, y);
        }

        // Footer + 水印
        this._drawWatermark(ctx);

        return new Promise(resolve => this.canvas.toBlob(b => resolve(b), 'image/png', 0.95));
    }

    /**
     * 绘制噪点背景
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} w 
     * @param {number} h 
     * @param {number} dots - 噪点数量
     * @private
     */
    _drawNoise(ctx,w,h,dots){
        ctx.save();
        ctx.fillStyle = SHARE_CONFIG.COLORS.bgNoise;
        for(let i=0;i<dots;i++){
            const x=Math.random()*w; const y=Math.random()*h; const a=Math.random()*0.08; ctx.globalAlpha=a; ctx.fillRect(x,y,1,1);
        }
        ctx.restore();
    }

    /**
     * 绘制标题
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} y 
     * @private
     */
    _drawTitle(ctx,y){
        ctx.fillStyle = SHARE_CONFIG.COLORS.title;
        ctx.font = SHARE_CONFIG.FONTS.title;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('多人武器分配', SHARE_CONFIG.PADDING, y);
        ctx.fillStyle = SHARE_CONFIG.COLORS.sub;
        ctx.font = SHARE_CONFIG.FONTS.challenge;
        const date = new Date().toLocaleDateString('zh-CN');
        ctx.fillText(date, SHARE_CONFIG.PADDING, y + 44);
    }

    /**
     * 绘制分隔线
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} y 
     * @private
     */
    _drawDivider(ctx,y){
        ctx.strokeStyle = SHARE_CONFIG.COLORS.divider;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(SHARE_CONFIG.PADDING, y);
        ctx.lineTo(SHARE_CONFIG.CANVAS_WIDTH - SHARE_CONFIG.PADDING, y);
        ctx.stroke();
    }

    /**
     * 绘制玩家网格
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Array} players 
     * @param {number} startY 
     * @param {number} gridHeightTop - 网格区域预留高度
     * @returns {number} 新的Y位置
     * @private
     */
    _drawPlayersGrid(ctx, players, startY, gridHeightTop){
        const count = players.length;
        if (count === 0) return startY;
        const areaWidth = SHARE_CONFIG.CANVAS_WIDTH - SHARE_CONFIG.PADDING*2;
        const colCount = count <= 2 ? 1 : 2;
        const colWidth = colCount === 1 ? Math.min(600, areaWidth) : (areaWidth - SHARE_CONFIG.GRID_GAP)/2;
        const cardGapY = 24;
        let xLeft = SHARE_CONFIG.PADDING + (areaWidth - (colCount === 1 ? colWidth : (colWidth*2 + SHARE_CONFIG.GRID_GAP)))/2;
        let currentY = startY;
        let rowHeights = [];

        for (let i=0;i<count;i++){
            const player = players[i];
            const col = colCount===1?0:i%2;
            const row = colCount===1?i:Math.floor(i/2);
            if(!rowHeights[row]) rowHeights[row]=0;
            const cardX = colCount===1? xLeft : xLeft + col*(colWidth + SHARE_CONFIG.GRID_GAP);
            const cardY = startY + rowHeights.slice(0,row).reduce((a,b)=>a+b,0) + (row>0?row*cardGapY:0);
            const cardHeight = this._drawPlayerCard(ctx, player, cardX, cardY, colWidth);
            rowHeights[row] = cardHeight;
        }
        const totalHeight = rowHeights.reduce((a,b)=>a+b,0) + cardGapY*(rowHeights.length-1);
        return startY + totalHeight;
    }

    /**
     * 绘制单个玩家卡片
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} player 
     * @param {number} x 
     * @param {number} y 
     * @param {number} width 
     * @private
     */
    _drawPlayerCard(ctx, player, x, y, width){
        const padding = 20;
        const iconSize = 72;
        const topBarHeight = 4;
        // 预估挑战文本高度
        const challengeText = player.challenge ? `挑战：${player.challenge}` : '';
        const challengeLines = challengeText? this._wrapLines(ctx, challengeText, width - padding*2, SHARE_CONFIG.FONTS.challenge, SHARE_CONFIG.PLAYER_MAX_LINES):[];
        const baseHeight = 20 + iconSize + 12 + 30 + (challengeLines.length? (challengeLines.length*20 + 12):0) + padding; // 动态高度
        const height = baseHeight;

        // 阴影 & 卡片
        this._roundRectPath(ctx, x, y, width, height, 18);
        ctx.fillStyle = 'rgba(0,0,0,0.04)'; ctx.fill();
        this._roundRectPath(ctx, x, y, width, height, 16);
        ctx.fillStyle = SHARE_CONFIG.COLORS.cardBg; ctx.fill();
        ctx.strokeStyle = SHARE_CONFIG.COLORS.cardBorder; ctx.lineWidth = 1; ctx.stroke();
        // 顶部色条按武器色或默认
        const color = (player.weapon && player.weapon.color) || SHARE_CONFIG.COLORS.accent;
        ctx.fillStyle = color; ctx.fillRect(x, y, width, topBarHeight);

        // 武器图标圆背景
        const centerX = x + width/2;
        const iconY = y + 20 + topBarHeight;
        ctx.beginPath(); ctx.arc(centerX, iconY + iconSize/2, iconSize/2 + 10, 0, Math.PI*2); ctx.fillStyle = '#f1f5f9'; ctx.fill();
        // 图标
        if (player.weapon){
            const img = this.weaponIconCache.get(player.weapon.name);
            if (img) ctx.drawImage(img, centerX - iconSize/2, iconY, iconSize, iconSize);
            else { ctx.fillStyle = '#cbd5e1'; ctx.font='32px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⚔️', centerX, iconY + iconSize/2); }
        }

        // 武器名
        ctx.fillStyle = color; ctx.font = SHARE_CONFIG.FONTS.playerWeapon; ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillText(player.weapon?player.weapon.name:'未知武器', centerX, iconY + iconSize + 12);
        // 玩家名标签
        ctx.fillStyle = '#f1f5f9';
        const nameText = player.name || '玩家';
        ctx.font = SHARE_CONFIG.FONTS.playerName;
        const nameWidth = ctx.measureText(nameText).width + 24;
        const nameX = centerX - nameWidth/2;
        const nameY = iconY + iconSize + 12 + 34;
        this._roundRectPath(ctx, nameX, nameY, nameWidth, 30, 16);
        ctx.fill();
        ctx.fillStyle = SHARE_CONFIG.COLORS.sub; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(nameText, centerX, nameY + 15);

        // 挑战文本
        if (challengeLines.length){
            let cy = nameY + 30 + 12;
            ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillStyle = SHARE_CONFIG.COLORS.sub; ctx.font = SHARE_CONFIG.FONTS.challenge;
            for (let line of challengeLines){
                ctx.fillText(line, x + padding, cy);
                cy += 20;
            }
        }

        return height + 8; // 返回所占高度（含间距微调）
    }

    /**
     * 绘制团队挑战区域
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {number} y 
     * @private
     */
    _drawTeamChallenge(ctx, text, y){
        const x = SHARE_CONFIG.PADDING;
        const width = SHARE_CONFIG.CANVAS_WIDTH - SHARE_CONFIG.PADDING*2;
        const padding = 24;
        const lines = this._wrapLines(ctx, text, width - padding*2, SHARE_CONFIG.FONTS.challenge, SHARE_CONFIG.TEAM_MAX_LINES);
        const height = 28 + 16 + lines.length*20 + padding*2;
        this._roundRectPath(ctx, x, y, width, height, 20);
        ctx.fillStyle = SHARE_CONFIG.COLORS.teamBg; ctx.fill();
        ctx.strokeStyle = SHARE_CONFIG.COLORS.teamBorder; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = SHARE_CONFIG.COLORS.teamTitle; ctx.font = SHARE_CONFIG.FONTS.teamTitle; ctx.textAlign='left'; ctx.textBaseline='top';
        ctx.fillText('📋 团队挑战', x + padding, y + padding);
        ctx.fillStyle = SHARE_CONFIG.COLORS.sub; ctx.font = SHARE_CONFIG.FONTS.challenge;
        let ty = y + padding + 32;
        for (let line of lines){ ctx.fillText(line, x + padding, ty); ty += 20; }
        return y + height;
    }

    /**
     * 绘制水印
     * @param {CanvasRenderingContext2D} ctx 
     * @private
     */
    _drawWatermark(ctx){
        ctx.fillStyle = SHARE_CONFIG.COLORS.watermark;
        ctx.font = SHARE_CONFIG.FONTS.footer;
        ctx.textAlign='right'; ctx.textBaseline='bottom';
        ctx.fillText(SHARE_CONFIG.WATERMARK, SHARE_CONFIG.CANVAS_WIDTH - SHARE_CONFIG.PADDING, SHARE_CONFIG.CANVAS_HEIGHT - SHARE_CONFIG.PADDING/2);
    }

    /**
     * 智能换行 - 根据最大宽度和行数限制文本
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} text 
     * @param {number} maxWidth 
     * @param {string} font 
     * @param {number} maxLines 
     * @returns {Array<string>} 换行后的文本数组
     * @private
     */
    _wrapLines(ctx, text, maxWidth, font, maxLines){
        ctx.font = font;
        const chars = text.split('');
        const lines=[]; let current='';
        for (let c of chars){
            const test = current + c;
            if (ctx.measureText(test).width > maxWidth){
                lines.push(current); current = c;
                if (maxLines && lines.length === maxLines){ break; }
            } else current = test;
        }
        if (lines.length < maxLines) lines.push(current);
        if (maxLines && lines.length > maxLines){ lines.length = maxLines; }
        // 省略号处理
        if (maxLines && lines.length === maxLines){
            const last = lines[maxLines-1];
            if (ctx.measureText(last).width > maxWidth){
                let trimmed = last;
                while (trimmed.length && ctx.measureText(trimmed + '…').width > maxWidth){
                    trimmed = trimmed.slice(0,-1);
                }
                lines[maxLines-1] = trimmed + '…';
            }
        }
        return lines.filter(l=>l.trim().length>0);
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
    _roundRectPath(ctx,x,y,w,h,r){
        ctx.beginPath();
        ctx.moveTo(x+r,y);
        ctx.lineTo(x+w-r,y);
        ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h-r);
        ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
        ctx.lineTo(x+r,y+h);
        ctx.quadraticCurveTo(x,y+h,x,y+h-r);
        ctx.lineTo(x,y+r);
        ctx.quadraticCurveTo(x,y,x+r,y);
        ctx.closePath();
    }
}

/**
 * 分享功能主控制器
 */
export class ShareController {
    constructor(){
        this.generator = new ShareImageGenerator();
        this.isSharing = false;
        this.shareButton = null;
        this.initialized = false;
    }

    /**
     * 初始化分享控制器（绑定DOM和事件）
     * @param {Function} getAppState - 获取应用状态的函数
     */
    init(getAppState){
        if (this.initialized) return;
        
        this.getAppState = getAppState;
        this.shareButton = document.getElementById('shareResultsBtn');
        
        if (this.shareButton){
            // 绑定方法引用以便后续正确移除
            this._boundHandleShare = () => this.handleShare();
            this.shareButton.addEventListener('click', this._boundHandleShare);
        }
        
        this.initialized = true;
    }

    /**
     * 处理分享按钮点击
     */
    async handleShare(){
        if (!this.getAppState) return;
        const appState = this.getAppState();
        const playersWithWeapons = appState.multiplayer.players.filter(p=>p.weapon);
        if (playersWithWeapons.length === 0){ this._showMessage('请先分配武器再分享','error'); return; }
        await this.share({ players: playersWithWeapons, teamChallenge: appState.multiplayer.teamChallenge });
    }

    /**
     * 更新分享按钮状态 - 简化为一直显示
     * @param {Object} appState - 应用状态
     */
    updateUI(appState){
        if (!this.shareButton) return;
        const hasResults = appState.multiplayer.players.some(p=>p.weapon);
        this.shareButton.disabled = this.isSharing || !hasResults || appState.multiplayer.isAssigning;
        this.shareButton.classList.toggle('loading', this.isSharing);
    }

    /**
     * 执行分享操作
     * @param {Object} shareData - 分享数据
     * @returns {Promise<boolean>} 分享是否成功
     */
    async share(shareData){
        if (this.isSharing) return false;
        this.isSharing = true; this.updateUI(this.getAppState());
        try {
            const blob = await this.generator.generateMultiplayerShareImage(shareData);
            // 剪贴板优先
            const copied = await this._tryClipboard(blob);
            if (copied){ this._showMessage('已复制到剪贴板，快去粘贴吧！','success'); return true; }
            // 降级：原生分享
            const native = await this._tryNativeShare(blob);
            if (native){ this._showMessage('已调用系统分享','success'); return true; }
            // 再降级：下载
            await this._download(blob);
            this._showMessage('已保存图片（剪贴板不可用）','info');
            return true;
        } catch (e){
            console.error(e);
            this._showMessage('分享失败，请尝试截图','error');
            return false;
        } finally {
            this.isSharing = false; this.updateUI(this.getAppState());
        }
    }

    /**
     * 尝试剪贴板分享
     * @param {Blob} blob - 图片Blob
     * @returns {Promise<boolean>} 是否成功
     * @private
     */
    async _tryClipboard(blob){
        try {
            if (!navigator.clipboard || typeof ClipboardItem === 'undefined' || !window.isSecureContext) return false;
            const item = new ClipboardItem({ [blob.type]: blob });
            await navigator.clipboard.write([item]);
            return true;
        } catch { return false; }
    }

    /**
     * 尝试原生分享
     * @param {Blob} blob - 图片Blob
     * @returns {Promise<boolean>} 是否成功
     * @private
     */
    async _tryNativeShare(blob){
        try {
            if (!navigator.share) return false;
            const file = new File([blob], `猎人小队-${Date.now()}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })){
                await navigator.share({ files:[file], title:'猎人小队武器分配', text:'我们的猎人武器配置' });
                return true;
            }
            return false;
        } catch { return false; }
    }

    /**
     * 下载图片
     * @param {Blob} blob - 图片Blob
     * @private
     */
    async _download(blob){
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `猎人小队-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),200);
    }

    /**
     * 显示消息提示 - 更优雅协调的设计
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 ('success' | 'error' | 'info')
     * @private
     */
    _showMessage(message,type='info'){
        const toast = document.createElement('div');
        toast.textContent = message;
        const color = type==='success'? '#16a34a': type==='error'? '#dc2626': '#475569';
        Object.assign(toast.style, {
            position:'fixed', top:'24px', left:'50%', transform:'translateX(-50%) translateY(-8px)',
            background: color, color:'#fff', padding:'10px 18px', borderRadius:'10px', fontSize:'14px', fontWeight:'500',
            fontFamily:'"Noto Sans SC", sans-serif', zIndex:9999, opacity:'0', transition:'all .35s cubic-bezier(.4,.8,.2,1)'
        });
        document.body.appendChild(toast);
        requestAnimationFrame(()=>{ toast.style.opacity='1'; toast.style.transform='translateX(-50%) translateY(0)'; });
        setTimeout(()=>{ toast.style.opacity='0'; toast.style.transform='translateX(-50%) translateY(-8px)'; setTimeout(()=>toast.remove(),350); },3400);
    }

    /**
     * 销毁分享控制器
     */
    destroy(){ if (this.shareButton) this.shareButton.removeEventListener('click', this._boundHandleShare); }
}
