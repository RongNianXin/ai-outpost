# AI Outpost 工作流

本文把《工作流方案 2：轻量提示词卡片版》落到 AI Outpost 项目中，用于后续 Codex、Claude Code、DeepSeek 或其他 AI 接手。

## 当前项目阶段

AI Outpost 已完成项目启动和计划确认，当前处于：

> 日常开发 / 公开发布前准备。

项目不是从零规划阶段，也不是最终验收阶段。第 001 期仍处于本地预览状态，尚未公开发布。

## 接手时先读

新会话或新 AI 接手时，默认先读根目录三文件：

1. `task_plan.md`
2. `findings.md`
3. `progress.md`

只有当当前任务需要更详细背景时，再读取：

- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTENT-OPS.md`
- `docs/PROGRESS.md`

不要默认扫描全仓库。

## 日常开发规则

- 简单任务直接轻量执行。
- 复杂任务先说明执行方式，再进入设计、调试或验证流程。
- 只读取完成当前任务真正需要的文件。
- 修改范围保持最小，不提前实现 V2/V3。
- 完成后更新 `progress.md`。
- 如果发现长期有价值的约束、坑点或判断，更新 `findings.md`。
- 如果阶段状态、下一步或验收标准变化，更新 `task_plan.md`。

## 复杂任务规则

以下情况需要更重流程：

- 新子系统。
- 跨多个模块。
- 影响内容 schema、发布闸门、构建流程或部署流程。
- 涉及安全、成本、自动化发布、数据迁移或用户数据。
- 修复难以定位的 Bug。
- 最终发布前验收。

重流程要求：

1. 先澄清目标和验收标准。
2. 必要时给 2-3 个方案和推荐方案。
3. 获得确认后再修改。
4. 变更后运行必要验证。
5. 把结果写入 `progress.md`，把长期结论写入 `findings.md`。

## Git 规则

- 默认不自动提交 Git。
- 默认不推送、不合并、不创建 PR。
- 只有用户明确要求“保存版本”“提交”“打标签”等，才执行 Git 操作。
- 执行 Git 前先检查 `git status --short`。
- 提交后报告 commit 和 tag。

## 当前常用命令

```powershell
pnpm.cmd content:validate
pnpm.cmd content:check:links
pnpm.cmd content:export:wechat
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
```

本地预览：

```powershell
pnpm.cmd dev
```

默认地址：

```text
http://127.0.0.1:3100/
```

## 发布前检查

公开发布前必须确认：

- 第 001 期内容已经完成 AI 交叉核查、离线校验和发布前链接检查。
- `publishedAt` 已填写。
- 期刊状态已切换为 `published`。
- 内容校验、链接检查、公众号导出、类型检查、lint、测试和构建均通过。
- 首页、归档页、关于页和期刊详情页可访问。
- 移动端无横向滚动。

## 不要做

- 不把 AI Outpost 与“灵感雷达”合并。
- 不引入数据库、CMS、登录、聊天框或用户 API Key。
- 不开发短视频生成、自动剪辑或自动发布。
- 不为了未来功能提前建设复杂平台。
- 不把未经自动验证和发布前构建检查的内容发布到生产站点。
