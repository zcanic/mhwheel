// imageGenerator.js - 分享图片生成（<200行）
// 职责：接受结构化结果数据，生成多人模式分享 PNG Blob。
// 仅处理 Canvas 绘制与文本排版；不包含任何 DOM 查询或业务状态逻辑。

export const SHARE_CONFIG = {
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 768,
  PADDING: 56,
  GRID_GAP: 28,
  PLAYER_MAX_LINES: 3,
  TEAM_MAX_LINES: 3,
  WATERMARK: 'zcanic.xyz/mhwheel',
  COLORS: {
    background: '#ffffff',
    primary: '#0f172a',
    secondary: '#475569',
    text: '#0f172a',
    divider: '#e2e8f0',
    accent: '#3b82f6',
    teamBg: '#f0f9ff',
    teamBorder: '#bae6fd',
    teamTitle: '#0369a1',
    watermark: '#94a3b8',
    // 之前遗漏的渐变/噪点/卡片颜色键
    bgGradientInner: '#f8fafc',
    bgGradientOuter: '#e2e8f0',
    bgNoise: '#0f172a',
    title: '#0f172a',
    sub: '#64748b',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0'
  },
  FONTS: {
    title: '600 40px "Noto Sans SC", sans-serif',
    playerWeapon: '600 26px "Noto Sans SC", sans-serif',
    playerName: '500 16px "Noto Sans SC", sans-serif',
    challenge: '400 14px "Noto Sans SC", sans-serif',
    teamTitle: '600 20px "Noto Sans SC", sans-serif',
    footer: '400 12px "Noto Sans SC", sans-serif'
  }
};

export class ShareImageGenerator {
  constructor(){
    this.canvas=null; this.ctx=null; this.weaponIconCache=new Map();
    // 缓存背景（径向渐变 + 噪点）避免每次重新采样随机点
    this._bgLayer=null; // OffscreenCanvas / 普通 canvas
  }
  _init(){
    if(!this.canvas){
      this.canvas=document.createElement('canvas');
      this.canvas.width=SHARE_CONFIG.CANVAS_WIDTH;
      this.canvas.height=SHARE_CONFIG.CANVAS_HEIGHT;
      this.ctx=this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled=true;
      this.ctx.imageSmoothingQuality='high';
    }
    if(!this._bgLayer){
      const off=document.createElement('canvas');
      off.width=SHARE_CONFIG.CANVAS_WIDTH; off.height=SHARE_CONFIG.CANVAS_HEIGHT;
      const c=off.getContext('2d');
      // 渐变
      const W=SHARE_CONFIG.CANVAS_WIDTH, H=SHARE_CONFIG.CANVAS_HEIGHT;
      const grad=c.createRadialGradient(W/2,H/2,100,W/2,H/2,Math.max(W,H)/1.1);
      grad.addColorStop(0,SHARE_CONFIG.COLORS.bgGradientInner);
      grad.addColorStop(1,SHARE_CONFIG.COLORS.bgGradientOuter);
      c.fillStyle=grad; c.fillRect(0,0,W,H);
      // 噪点（固定随机种子可选，这里直接一次性）
      c.fillStyle=SHARE_CONFIG.COLORS.bgNoise;
      for(let i=0;i<1600;i++){ const x=Math.random()*W, y=Math.random()*H, a=Math.random()*0.08; c.globalAlpha=a; c.fillRect(x,y,1,1);} c.globalAlpha=1;
      this._bgLayer=off;
    }
  }
  async _loadWeaponIcon(weapon){ return new Promise(res=>{ if(!weapon||!weapon.icon) return res(null); if(this.weaponIconCache.has(weapon.name)) return res(this.weaponIconCache.get(weapon.name)); const img=new Image(); img.crossOrigin='anonymous'; img.onload=()=>{ this.weaponIconCache.set(weapon.name,img); res(img); }; img.onerror=()=>{ this.weaponIconCache.set(weapon.name,null); res(null); }; img.src=weapon.icon; }); }
  async _preload(weapons){ await Promise.allSettled(weapons.map(w=>this._loadWeaponIcon(w))); }

  async generateMultiplayerShareImage({ players, teamChallenge }){
    this._init(); const ctx=this.ctx; const W=SHARE_CONFIG.CANVAS_WIDTH; const H=SHARE_CONFIG.CANVAS_HEIGHT;
    const usablePlayers = players.slice(0,4);
    await this._preload(usablePlayers.map(p=>p.weapon).filter(Boolean));
    // 背景（复用缓存层）
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(this._bgLayer,0,0);
    let y=SHARE_CONFIG.PADDING; this._title(ctx,y); y+=64; this._divider(ctx,y-20);
    y=this._playersGrid(ctx,usablePlayers,y); if(teamChallenge){ y+=24; y=this._team(ctx,teamChallenge,y); }
    this._watermark(ctx);
    return new Promise(r=>this.canvas.toBlob(b=>r(b),'image/png',0.95));
  }
  // _noise: 已由缓存背景层内部实现（保留接口兼容，如后续需要动态强噪点）
  _noise(){/* deprecated: background layer now cached */}
  _title(ctx,y){ ctx.fillStyle=SHARE_CONFIG.COLORS.title; ctx.font=SHARE_CONFIG.FONTS.title; ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText('多人武器分配',SHARE_CONFIG.PADDING,y); ctx.fillStyle=SHARE_CONFIG.COLORS.sub; ctx.font=SHARE_CONFIG.FONTS.challenge; ctx.fillText(new Date().toLocaleDateString('zh-CN'),SHARE_CONFIG.PADDING,y+44); }
  _divider(ctx,y){ ctx.strokeStyle=SHARE_CONFIG.COLORS.divider; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(SHARE_CONFIG.PADDING,y); ctx.lineTo(SHARE_CONFIG.CANVAS_WIDTH-SHARE_CONFIG.PADDING,y); ctx.stroke(); }
  _playersGrid(ctx,players,startY){ const count=players.length; if(!count) return startY; const areaW=SHARE_CONFIG.CANVAS_WIDTH-SHARE_CONFIG.PADDING*2; const colCount=count<=2?1:2; const colW=colCount===1?Math.min(600,areaW):(areaW-SHARE_CONFIG.GRID_GAP)/2; const gapY=24; const xLeft=SHARE_CONFIG.PADDING+(areaW-(colCount===1?colW:(colW*2+SHARE_CONFIG.GRID_GAP)))/2; let rowHeights=[]; for(let i=0;i<count;i++){ const p=players[i]; const col=colCount===1?0:i%2; const row=colCount===1?i:Math.floor(i/2); if(!rowHeights[row]) rowHeights[row]=0; const cardX=colCount===1?xLeft:xLeft+col*(colW+SHARE_CONFIG.GRID_GAP); const cardY=startY+rowHeights.slice(0,row).reduce((a,b)=>a+b,0)+(row>0?row*gapY:0); const h=this._playerCard(ctx,p,cardX,cardY,colW); rowHeights[row]=h; } const total=rowHeights.reduce((a,b)=>a+b,0)+gapY*(rowHeights.length-1); return startY+total; }
  _playerCard(ctx,player,x,y,w){ const pad=20,icon=72,topBar=4; const challengeText=player.challenge?`挑战：${player.challenge}`:''; const challengeLines=challengeText?this._wrap(ctx,challengeText,w-pad*2,SHARE_CONFIG.FONTS.challenge,SHARE_CONFIG.PLAYER_MAX_LINES):[]; const height=20+icon+12+30+(challengeLines.length?(challengeLines.length*20+12):0)+pad; this._roundRect(ctx,x,y,w,height,18); ctx.fillStyle='rgba(0,0,0,0.04)'; ctx.fill(); this._roundRect(ctx,x,y,w,height,16); ctx.fillStyle=SHARE_CONFIG.COLORS.cardBg; ctx.fill(); ctx.strokeStyle=SHARE_CONFIG.COLORS.cardBorder; ctx.lineWidth=1; ctx.stroke(); const color=(player.weapon&&player.weapon.color)||SHARE_CONFIG.COLORS.accent; ctx.fillStyle=color; ctx.fillRect(x,y,w,topBar); const centerX=x+w/2; const iconY=y+20+topBar; ctx.beginPath(); ctx.arc(centerX,iconY+icon/2,icon/2+10,0,Math.PI*2); ctx.fillStyle='#f1f5f9'; ctx.fill(); if(player.weapon){ const img=this.weaponIconCache.get(player.weapon.name); if(img) ctx.drawImage(img,centerX-icon/2,iconY,icon,icon); else { ctx.fillStyle='#cbd5e1'; ctx.font='32px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⚔️',centerX,iconY+icon/2); } } ctx.fillStyle=color; ctx.font=SHARE_CONFIG.FONTS.playerWeapon; ctx.textAlign='center'; ctx.textBaseline='top'; ctx.fillText(player.weapon?player.weapon.name:'未知武器',centerX,iconY+icon+12); ctx.fillStyle='#f1f5f9'; const name=player.name||'玩家'; ctx.font=SHARE_CONFIG.FONTS.playerName; const nameW=ctx.measureText(name).width+24; const nameX=centerX-nameW/2; const nameY=iconY+icon+12+34; this._roundRect(ctx,nameX,nameY,nameW,30,16); ctx.fill(); ctx.fillStyle=SHARE_CONFIG.COLORS.sub; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(name,centerX,nameY+15); if(challengeLines.length){ let cy=nameY+30+12; ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillStyle=SHARE_CONFIG.COLORS.sub; ctx.font=SHARE_CONFIG.FONTS.challenge; for(const line of challengeLines){ ctx.fillText(line,x+pad,cy); cy+=20; } } return height+8; }
  _team(ctx,text,y){ const x=SHARE_CONFIG.PADDING; const w=SHARE_CONFIG.CANVAS_WIDTH-SHARE_CONFIG.PADDING*2; const pad=24; const lines=this._wrap(ctx,text,w-pad*2,SHARE_CONFIG.FONTS.challenge,SHARE_CONFIG.TEAM_MAX_LINES); const h=28+16+lines.length*20+pad*2; this._roundRect(ctx,x,y,w,h,20); ctx.fillStyle=SHARE_CONFIG.COLORS.teamBg; ctx.fill(); ctx.strokeStyle=SHARE_CONFIG.COLORS.teamBorder; ctx.lineWidth=1; ctx.stroke(); ctx.fillStyle=SHARE_CONFIG.COLORS.teamTitle; ctx.font=SHARE_CONFIG.FONTS.teamTitle; ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText('📋 团队挑战',x+pad,y+pad); ctx.fillStyle=SHARE_CONFIG.COLORS.sub; ctx.font=SHARE_CONFIG.FONTS.challenge; let ty=y+pad+32; for(const line of lines){ ctx.fillText(line,x+pad,ty); ty+=20; } return y+h; }
  _watermark(ctx){ ctx.fillStyle=SHARE_CONFIG.COLORS.watermark; ctx.font=SHARE_CONFIG.FONTS.footer; ctx.textAlign='right'; ctx.textBaseline='bottom'; ctx.fillText(SHARE_CONFIG.WATERMARK,SHARE_CONFIG.CANVAS_WIDTH-SHARE_CONFIG.PADDING,SHARE_CONFIG.CANVAS_HEIGHT-SHARE_CONFIG.PADDING/2); }
  _wrap(ctx,text,maxW,font,maxLines){ ctx.font=font; const chars=[...text]; const lines=[]; let cur=''; for(const c of chars){ const test=cur+c; if(ctx.measureText(test).width>maxW){ lines.push(cur); cur=c; if(maxLines&&lines.length===maxLines) break; } else cur=test; } if(lines.length<maxLines) lines.push(cur); if(maxLines&&lines.length>maxLines) lines.length=maxLines; if(maxLines&&lines.length===maxLines){ const last=lines[maxLines-1]; if(ctx.measureText(last).width>maxW){ let t=last; while(t.length&&ctx.measureText(t+'…').width>maxW) t=t.slice(0,-1); lines[maxLines-1]=t+'…'; } } return lines.filter(l=>l.trim().length>0); }
  _roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }
}
