# multiplayer 目录

多人模式相关业务逻辑：
- `assign.js` 负责：初次分配 / 重roll / 团队挑战随机。

设计：
- 输入：当前激活武器 / 玩家数组（从 state 获取）
- 输出：直接写入 state（updatePlayer / setAssigning 等）
- 延迟揭示通过 await + setTimeout 模式模拟动画节奏

后续可以扩展：
- reroll 次数策略配置化
- 允许自定义挑战池
- 添加协同（WebSocket 同步）
