# 生产部署强化改造计划

## 总体目标
- 恢复并保障核心玩法可用（单人旋转 / 多人分配 / 分享）。
- 补齐关键状态持久化与离线体验，降低线上回退风险。
- 清理遗留实现，提升代码可维护性，完善测试覆盖。

## 任务分解

### A. 核心功能修复
1. **恢复单人转盘动画**
   - [x] `core/spin.js` 与 `wheel.js` 同步旋转角度，确保 Canvas 动画正确播放。
   - [x] 补充回归测试，验证转盘动画状态（利用 `window.__TEST_FAST__` 断言 `wheel.getRotation()` 更新）。

2. **恢复设置持久化能力**
   - [x] 在状态写操作（`setMode` / `setActiveWeapons` / reset flows）中调用 `settingsManager.updateSettings`。
   - [x] 增加 Playwright 测试：修改武器池 → 刷新 → 配置仍存在。

### B. 体验与性能加固
3. **多人分配节奏可配置**
   - [x] 将 `assign.js` 的 reveal 延迟参数化（含测试快速模式挂钩）。
   - [x] Playwright 测试等待逻辑改为等待 `isAssigning === false`，消除硬编码 `waitForTimeout`。

4. **Service Worker 缓存覆盖补全**
   - [x] 将入口相关脚本（`settings.js`、`sound.js` 等）加入 `CORE_ASSETS`。
   - [x] 增加版本注释，提示修改资源后需 bump `VERSION`。

5. **Tone.js CDN 兜底**
   - [x] 引入本地 `Tone.js` 备份（或构建期下载）并在加载失败时回退。

### C. 代码整洁与可维护性
6. **清理遗留入口与重复模块**
   - [x] 移除或迁移 `js/main.js`、`js/ui.js`、`js/multiplayer.js` 等旧实现。
   - [x] README 加一节“遗留说明/迁移指南”，指向新模块。

7. **ID 生成与事件安全**
   - [x] 玩家 ID 改用 `crypto.randomUUID()`（含 fallback）。
   - [x] 在 `addPlayer` 等接口中处理极端快速点击。

### D. 测试与自动化
8. **增强 Playwright 测试**
   - [x] `single-spin`：断言 `window.__TEST_SPIN_ANGLE__` 变化。
   - [x] `multiplayer-assign`：等待 `isAssigning === false`，确认所有玩家揭示且无重复。
   - [x] 新增 `settings-persistence.spec.js`：验证刷新后状态保存。

9. **文档与运行指引更新**
   - [x] README 新增生产部署注意事项（缓存、Tone.js、测试命令）。
   - [x] 计划完成后在 `CHANGELOG` 或 `README` 上记录版本变更。

---
**执行顺序建议：** A → B → C → D，每完成一项在此文件勾选对勾，并附带相关提交说明。