// --- 游戏数据与设定 ---

/**
 * 生成武器图标路径
 * @param {string} filename - 图标文件名
 * @returns {string} 完整的图标路径
 */
const getWeaponIconPath = (filename) => {
    // 使用相对路径，提高部署灵活性
    try {
        // 在浏览器环境中使用import.meta.url
        return new URL(`../weapon_icon/${filename}`, import.meta.url).href;
    } catch (e) {
        // 回退到绝对路径
        return `/mhwheel/weapon_icon/${filename}`;
    }
};

/**
 * 武器数据数组
 * @type {Array<{name: string, icon: string, color: string, flavor: string}>}
 */
export const weapons = [
    { name: '大剑', icon: getWeaponIconPath('大剑.png'), color: '#ef4444', flavor: '一击脱离，真男人从不回头看蓄力斩！' },
    { name: '太刀', icon: getWeaponIconPath('太刀.png'), color: '#f97316', flavor: '见切如风，登龙如画，帅是一辈子的事！' },
    { name: '片手剑', icon: getWeaponIconPath('片手剑.png'), color: '#eab308', flavor: '最灵活的猎人，在怪物的脚边起舞！' },
    { name: '双刀', icon: getWeaponIconPath('双刀.png'), color: '#84cc16', flavor: '鬼人化，乱舞！感受利刃的狂风吧！' },
    { name: '大锤', icon: getWeaponIconPath('大锤.png'), color: '#22c55e', flavor: '大地一击！没有什么是一锤子解决不了的！' },
    { name: '狩猎笛', icon: getWeaponIconPath('狩猎笛.png'), color: '#14b8a6', flavor: '最摇摆的猎人，用音符带来胜利！' },
    { name: '长枪', icon: getWeaponIconPath('长枪.png'), color: '#06b6d4', flavor: '不动如山，精准反击，最坚固的壁垒！' },
    { name: '铳枪', icon: getWeaponIconPath('铳枪.png'), color: '#3b82f6', flavor: '龙杭炮预备！艺术就是爆炸！' },
    { name: '斩斧', icon: getWeaponIconPath('斩斧.png'), color: '#6366f1', flavor: '剑斧切换，零距离解放，华丽的变形武器！' },
    { name: '盾斧', icon: getWeaponIconPath('盾斧.png'), color: '#8b5cf6', flavor: '超解！将积攒的能量，一瞬间全部释放！' },
    { name: '操虫棍', icon: getWeaponIconPath('操虫棍.png'), color: '#a855f7', flavor: '天空是你的领地，与猎虫一同飞舞吧！' },
    { name: '轻弩', icon: getWeaponIconPath('轻弩.png'), color: '#d946ef', flavor: '速射与走位，战场上的游击专家！' },
    { name: '重弩', icon: getWeaponIconPath('重弩.png'), color: '#ec4899', flavor: '蹲下，架起，让怪物感受金属风暴的洗礼！' },
    { name: '弓', icon: getWeaponIconPath('弓箭.png'), color: '#f43f5e', flavor: '滑步蓄力，龙之箭，贯穿一切的优雅猎手！' },
];

/**
 * 进阶挑战数据数组
 * @type {Array<string>}
 */
export const challenges = [
    '不使用任何道具（回复药除外）', '不携带随从猫/犬', '禁止使用翔虫受身', 
    '狩猎中途禁止返回营地', '禁止使用陷阱和异常状态道具', '全程不使用快速磨刀',
    '只允许使用替换技[朱]', '只允许使用替换技[苍]', '禁止骑乘任何怪物',
    '装备上至少一件“负技能”防具', '禁止使用环境生物', '禁止使用GP/看破斩等反击类招式',
    '只能使用初始装备进行狩猎',
    '穿上一套你最帅的幻化出击', '尝试一次“眠斩”或“眠爆”', '狩猎目标以外，再狩猎一只大型怪物',
    '只吃“随便什么”猫饭', '捕获而不是讨伐目标怪物', '讨伐而不是捕获目标怪物',
    '用一个帅气的姿势完成任务结算', '在狩猎前，先去吃一次兔兔团子', '找到任务地图里的一个隐藏彩蛋',
    '在怪物的“BGM”最激昂时完成讨伐', '给你的随从穿上最可爱的衣服', '在最高处使用动作‘飞吻’',
    '和地图里的环境生物合影',
    '破坏怪物的每一个可破坏部位', '尝试用环境生物对怪物造成伤害', '全程不让体力条低于50%',
    '只攻击怪物的弱点部位', '在10分钟内完成狩猎', '无伤完成一次怪物的“大招”处理',
    '全程不触发“毅力”或“猫的报酬术”', '不使用闪光弹或音爆弹', '完成一次“锁头”硬直',
    '全程不使用回家玉', '用异常状态攻击打出最后一击',
    '用捕获用麻醉球作为最后一击', '在怪物睡觉时，在它旁边放一个烤肉架', '狩猎开始后，先原地观察怪物1分钟再动手',
    '只使用投掷物（苦无、飞刀等）作为最后一击', '尝试用爆桶“炸飞”队友一次（开玩笑的喵！）',
    '在讨伐后，用光所有弹药/瓶子', '在怪物面前做一次“挑衅”动作并存活下来',
    '只吃一种颜色的团子', '在怪物换区时，比它先到下一个区'
];