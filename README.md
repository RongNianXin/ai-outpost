# AI Outpost

AI 前哨站是一份面向 AI 应用创造者的低维护情报周报。

它不追求覆盖所有 AI 新闻，而是从官方来源中筛选少量重要变化，解释这些变化为什么值得关注，并帮助读者判断是否需要继续深读。

> 看见变化，理解影响，判断优先级。

## V1 目标

- 每周运行一次生产流程，值得发布时输出最多 6 张情报卡
- 突出本期最多 3 个重要变化
- 同一份结构化内容生成网页和微信公众号草稿
- 使用 AI 交叉核查、离线内容校验和发布前链接检查降低人工审核成本
- 使用静态网站部署，不维护数据库和应用服务器

## 当前优先级

第 001 期已公开发布。下一阶段优先实现稳定周更内容生产：自动收集、筛选、核验、生成草稿、预览和发布前检查，最终由项目作者确认后上线。

微信公众号、小红书和 X/Twitter 前期只作为可选分享包输出方向，不作为近期自动发布目标。

## 技术方案

- Next.js 16
- TypeScript
- App Router
- CSS Modules
- Zod 内容校验
- Vitest 自动测试
- GitHub Pages 静态部署

## 本地命令

项目初始化完成后可使用：

```powershell
pnpm.cmd install
pnpm.cmd dev
pnpm.cmd content:validate
pnpm.cmd content:check:links
pnpm.cmd content:export:wechat
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```

Windows PowerShell 的脚本执行策略可能阻止 `pnpm.ps1`，因此文档统一使用 `pnpm.cmd`。

本地预览固定使用 3100 端口，避免和其他网页项目常用的 3000 端口冲突：

```text
http://127.0.0.1:3100/
```

旧版 Windows PowerShell 读取中文 JSON 时应显式指定 UTF-8：

```powershell
Get-Content -Raw -Encoding UTF8 content\issues\example-draft.json
```

## 项目文档

- [当前任务状态](task_plan.md)
- [长期项目发现](findings.md)
- [当前进度摘要](progress.md)
- [产品定义](docs/PRODUCT.md)
- [版本路线](docs/ROADMAP.md)
- [技术架构](docs/ARCHITECTURE.md)
- [内容生产流程](docs/CONTENT-OPS.md)
- [周更自动化验收清单](docs/WEEKLY-AUTOMATION-ACCEPTANCE.md)
- [第 002 期周更任务包](docs/ISSUE-002-WEEKLY-TASK-PACK.md)
- [项目工作流](docs/WORKFLOW.md)
- [关键决策](docs/DECISIONS.md)
- [研发进度](docs/PROGRESS.md)

## 新会话接手

新会话或新 AI 接手时，先读取：

1. `task_plan.md`
2. `findings.md`
3. `progress.md`

然后只按当前任务读取必要文件，不默认扫描全仓库。复杂任务再查阅 `docs/` 下的详细产品、架构和内容流程文档。

## 当前状态

项目已完成 V1 公开发布。第 001 期已完成标准化 AI 交叉核查并发布到 GitHub Pages；下一阶段进入 V1.5 稳定周更自动化规划。自动验证只能降低错误概率，重要信息仍以官方来源为准。

自动验证入口：

- [第 001 期自动验证摘要](docs/reviews/ISSUE-001-REVIEW.md)
- [AI 事实核验协议](docs/FACT-CHECK-PROTOCOL.md)
