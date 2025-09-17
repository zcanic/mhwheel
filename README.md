<div align="center">
    <h1>猎人命运轮盘</h1>
    <p>随机武器 & 挑战生成 · 单人 / 多人 · 一键精美分享</p>
</div>

**版本:** 2.3（生产优化 & PWA 缓存）  
**最后更新:** 2025-09-17

---

## 核心特性
- 单人：物理减速式旋转动画 + 可选进阶挑战
- 多人：2–4 玩家顺序揭示；个人 / 团队挑战；可切换“允许重复”
- 自定义武器池：即时重绘，状态持久化（localStorage）
- 一键分享：Canvas 生成 1024×768 PNG，剪贴板优先 → 原生分享 → 下载降级
- 音效：Tone.js 动态加载，失败容错（虚拟合成器）
- 纯前端，无后端依赖；任意静态托管可运行

## 近期重构（v2.2）
## 部署与缓存
- 支持 Service Worker 预缓存核心脚本 & 图标运行时缓存（离线可用基础功能）
- 版本升级：修改 `sw.js` 中 VERSION 以触发旧缓存清理
- 静态托管示例：GitHub Pages / Vercel / Netlify 直接指向仓库根目录
- 若更新武器图标资源，建议同时 bump VERSION 避免旧缓存残留

## 性能增量（v2.3）
## 测试（Playwright）
安装依赖（需 Node 18+）后运行：
```
npm install
npx playwright install --with-deps
npm test
```
环境变量：
- `CI=1` 时不会复用已存在的本地测试服务器
快速模式：测试通过 `window.__TEST_FAST__` 缩短旋转动画
- 分享背景（渐变+噪点）缓存，生成图片更快（避免重复随机）
- 轮盘静态层离屏缓存，仅旋转合成 + 高亮叠加
- 首屏关键图标与 CSS 预加载，减少首绘阻塞
- prefers-reduced-motion 降级动画，响应无障碍偏好
- 辅助：自检非法武器名，日志警告防配置污染
| 领域 | 变更 | 目的 |
|------|------|------|
| 分享模块 | 拆分为 `share/imageGenerator.js` + `share/controller.js` | 解耦绘制与交互，便于扩展/并行化 |
| 状态管理 | 新增 `state/appState.js` + 轻量订阅 | 移除隐式跨文件依赖，减少重复逻辑 |
| 多人逻辑 | 提炼 `multiplayer/assign.js` | 纯函数式分配/重roll，更易测试 |
| 单人旋转 | 提炼 `core/spin.js` | 动画/结果与渲染分离，后续可迁移至 Worker |
| 渲染 | 集中 `ui/render.js` | 单源渲染，减少 DOM 离散操作 |

## 目录结构（精简）
```
js/
    core/          # 核心纯逻辑 (spin)
    state/         # 全局状态与订阅
    multiplayer/   # 多人分配算法
    ui/            # 统一渲染层
    share/         # 分享绘制 & 控制
    data.js        # 静态数据：武器 / 挑战
    wheel.js       # 轮盘绘制 (Canvas)
    sound.js       # 音效加载与合成器
    utils.js       # 图标预加载等工具
    app.js         # 模块化入口 (取代旧 main.js)
```

## 模块职责一览
- `state/appState.js`：集中状态 + 订阅（emit/subscribe）
- `core/spin.js`：单人旋转动画 & 结果判定
- `multiplayer/assign.js`：玩家武器/挑战分配 + 重roll 逻辑
- `ui/render.js`：根据状态一次性更新 DOM
- `share/imageGenerator.js`：纯 Canvas 渲染（无副作用）
- `share/controller.js`：用户触发 → 生成 → 分发（多级降级）
- `wheel.js`：扇区绘制 + 指针高亮
- `sound.js`：懒加载 Tone.js，失败降级空实现

## 状态流转 (示意)
```
用户交互 → 状态变更(appState) → emit() → render() → DOM/Canvas 更新
                                                                     ↘ (可选) shareController.updateUI()
```

## 分享生成流水线
```
收集结果 → 预加载武器图标 → 绘制(渐变/噪点/卡片/文本) → toBlob →
    try 剪贴板
        else try 原生 share(files)
            else 下载 a[download]
```

## 设计取舍
- 不引入框架：体量小 + 清晰分层即可维持可维护性
- 单一订阅模型：避免引入复杂状态库（如 Redux/Signals）
- 同步 Canvas：当前绘制耗时低（<10ms）；留出 Worker 升级点
- 降级策略优先：任何可选功能失败不阻塞核心玩法

## 性能关注点
- 绘制：缓存已加载武器图标；文本测量仅在换行计算时进行
- DOM：渲染层批量构建 fragment，避免多次回流
- 音频：懒加载 Tone.js；失败 fallback 不抛异常
- 体积：拆模块保持文件 <200 行，快速审阅 & diff 友好

## 可扩展点（Backlog）
- OffscreenCanvas + Worker 异步分享生成
- 主题 / 自定义配色注入 (dark / high-contrast)
- i18n 抽离：传入字典表替换硬编码文案
- 分享多模板（紧凑 / 竖版 / 极简）
- 缓存最近 N 次结果（策略实验 / 统计）
- （已完成）移除旧 `main.js`，入口已切换为 `app.js`

## 错误与降级策略
| 场景 | 行为 |
|------|------|
| 剪贴板 API 不可用 | 跳过 → 原生 share / 下载 |
| `navigator.share` 不存在 | 直接下载 |
| Tone.js 加载失败 | 使用空对象避免报错 |
| 图标加载失败 | 退回符号 ⚔️ |
| 结果绘制异常 | 捕获并提示“分享失败” 不影响主流程 |

## 测试建议（轻量）
- 单人：选择 2 武器 → 连续 3 次旋转 → 结果武器 ∈ 选择集合
- 多人：禁止重复 + 玩家=武器数 → 无重复分配
- 重roll：重复允许时不会返回同一武器（>1 pool）
- 分享：断网/非安全上下文 → 应降级下载

## 版本摘要
- v2.2 模块化拆分 + 新分享架构
- v2.1 分享初版 + 多人功能增强
- v2.0 多人模式 & 状态驱动
- v1.x 单人基础轮盘

---
本项目专注“轻量 + 清晰 + 可拓展”。欢迎在 fork 中实验新玩法。🎯
