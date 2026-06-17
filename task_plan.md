# AI Outpost Task Plan

## 当前目标

AI 前哨站 V1 当前目标是完成本地预览版到公开发布前准备的收口：保持低维护静态站点架构，确认第 001 期内容和页面体验，随后进入 GitHub Pages 公开发布。

## 当前阶段判断

按《工作流方案 2》，本项目已经完成“项目刚开始”和“计划确认后”的主要工作，当前处于：

> 计划已确认，开发已推进，已补齐文件化状态，准备进入日常开发 / 公开发布前准备。

不是最终验收阶段，因为第 001 期仍处于 `approved` 本地预览状态，尚未切换为公开发布状态。

## 项目范围

### V1 范围

- 静态网页产品本体。
- 最新一期、历史归档、期刊详情和关于页面。
- 每期最多 6 张情报卡，最多 3 条重点变化。
- 原始来源、事实支撑、影响分析、行动建议和实践任务。
- 微信公众号 Markdown 导出。
- 内容 JSON 构建时校验。
- 本地预览和 GitHub Pages 静态发布。

### V1 非目标

- 登录注册。
- 用户 API Key。
- AI 聊天框。
- 实时新闻流。
- 个性化推荐。
- 数据库或 CMS。
- 大规模爬虫。
- 微信公众号自动发布。
- 短视频自动生成、配音、剪辑或发布。

## 当前里程碑

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| 治理基线 | complete | 产品、路线、架构和内容原则已建立 |
| 可运行骨架 | complete | Next.js 静态站点和基础路由已建立 |
| 内容引擎 | complete | Zod schema、内容校验、公众号导出和测试已建立 |
| MVP 页面 | complete | 首页、归档、详情和方法页已完成 |
| 第 001 期演练 | complete | 内容已覆盖到 2026-06-17，并进入本地预览 |
| V1.2 阅读流精修 | complete | 情报卡减压、策略标签和实践锚点已优化 |
| 公开发布 | pending | 尚未切换公开发布状态，GitHub Pages 未进入最终验收 |

## 当前验收状态

- 最新 Git 存档：`v0.9.0-v1.2-reading-flow`。
- 最新 commit：`9e922ae feat: refine issue content and reading flow`。
- 本地预览端口：`http://127.0.0.1:3100/`。
- 第 001 期详情页：`/issues/2026-06-17-ai-agent-model-workflows/`。
- 生产构建当前不会公开第 001 期，这是预期发布闸门。

## 下一步

1. 处理或接受当前链接检查警告：OpenAI 403、Google 超时；按防误杀规则不触发硬熔断。
2. 若发布前检查边界确认，将第 001 期切换为公开发布状态并填写发布时间。
3. 重新运行完整验证：`pnpm.cmd content:validate`、`pnpm.cmd content:check:links`、`pnpm.cmd content:export:wechat`、`pnpm.cmd typecheck`、`pnpm.cmd lint`、`pnpm.cmd test`、`pnpm.cmd build`。
4. 准备 GitHub Pages 公开发布。

## 工作规则

- 日常任务先读 `task_plan.md`、`findings.md`、`progress.md`。
- 只读取当前任务必需的代码和文档。
- 简单修改走轻量流程，不新增设计文档。
- 复杂功能、系统调试、代码审查或完成前验证时，AI 自动选择更重流程。
- 不自动执行 Git 提交、推送、合并或 PR，除非用户明确要求。
