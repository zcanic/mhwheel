# share 目录

模块说明：
- `imageGenerator.js` 纯绘制层：接收 `{ players, teamChallenge }`，返回 PNG Blob；不做 DOM 操作。
- `controller.js` UI 控制层：绑定按钮，调用生成器，提供剪贴板→原生分享→下载 三级降级；含最小 Toast。

特性：
- 1024x768 横版布局，最多 4 名玩家自适应 1 / 2 列网格
- 渐变 + 轻噪点背景、武器色顶部条、圆角卡片、智能换行（带省略号）
- 剪贴板优先（安全上下文 & ClipboardItem 支持）
- 多人挑战（个人 + 可选团队挑战）

后续可选改进：
- OffscreenCanvas + Worker 异步生成（避免主线程卡顿）
- 主题 (light/dark) 参数化 + 自定义配色注入
- 文本测量缓存（基于 font+char 序列 hash）
- 输出 JPEG / WebP 可选（质量参数）
- i18n：从外部传入文案字典而不是硬编码中文

契约（imageGenerator）：
Input: `{ players:[{name, weapon, challenge}], teamChallenge?:string }`
Output: `Promise<Blob>` (mime `image/png`)
错误策略：尽量容错（图标加载失败回退为符号），不抛异常。

文件行数约束：各文件 <200 行，便于快速审阅。
