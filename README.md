# AI Outpost

AI 前哨站是一份面向 AI 应用创造者的低维护情报周报。

它不追求覆盖所有 AI 新闻，而是从官方来源中筛选少量重要变化，解释这些变化为什么值得关注，并给出可以执行的下一步建议。

> 看见变化，理解影响，立即行动。

## V1 目标

- 每周运行一次生产流程，值得发布时输出最多 6 张情报卡
- 突出本期最多 3 个重要变化
- 提供产品机会和一个 30 至 120 分钟的实践任务
- 同一份结构化内容生成网页和微信公众号草稿
- 将发布者阅读中文摘要、网页预览和发布控制在 15 至 30 分钟，硬上限 45 分钟
- 使用静态网站部署，不维护数据库和应用服务器

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

- [产品定义](docs/PRODUCT.md)
- [版本路线](docs/ROADMAP.md)
- [技术架构](docs/ARCHITECTURE.md)
- [内容生产流程](docs/CONTENT-OPS.md)
- [关键决策](docs/DECISIONS.md)
- [研发进度](docs/PROGRESS.md)

## 当前状态

项目处于 V1 本地预览阶段。第 001 期已完成标准化 AI 交叉核查并进入本地预览，但尚未获得公开发布批准。生产构建不会包含该期内容，GitHub Pages 部署也只能手动触发。

发布者审核入口：

- [第 001 期审核包](docs/reviews/ISSUE-001-REVIEW.md)
- [AI 事实核验协议](docs/FACT-CHECK-PROTOCOL.md)
