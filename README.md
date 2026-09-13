<div align="center">

# AI 前哨站

**面向 AI 应用创造者的低维护情报周报与内容生产工作流。**

从官方来源筛选少量重要变化，解释影响、限制与下一步阅读路径。

[访问官网](https://rongnianxin.github.io/ai-outpost/) · [了解内容流程](docs/CONTENT-OPS.md)

[![官网](https://img.shields.io/badge/官网-AI%20前哨站-2563EB.svg)](https://rongnianxin.github.io/ai-outpost/)
[![最近更新](https://img.shields.io/github/last-commit/RongNianXin/ai-outpost?label=最近更新&color=0EA5A4)](https://github.com/RongNianXin/ai-outpost/commits/main)
[![GitHub Pages](https://img.shields.io/badge/部署-GitHub%20Pages-111827.svg)](https://rongnianxin.github.io/ai-outpost/)

<br />

<img src="assets/repository-cover.png" alt="AI 前哨站从多源 AI 资讯中筛选并形成结构化简报的示意图" width="100%" />

<sub>AI 生成示意图：从多源 AI 资讯到结构化简报的筛选过程。</sub>

</div>

> [!NOTE]
> 这是一个独立维护的内容与工程项目，不代表任何 AI 公司官方立场或背书。事实以文章中的原始来源为准，AI 负责辅助核验、整理和排版。

<!-- AI_OUTPOST_LATEST_START -->
## 最新一期

**AI 前哨站第 003 期**：会员暂停新购，长任务怎么验收？

从 Astra 需求挤压下的 200 美元 Pro 暂停新购，到 Agent 接手更长任务：本期既看模型与协作更新，也看价格、权限和验收边界。

[阅读本期官网](https://rongnianxin.github.io/ai-outpost/issues/2026-09-12-agents-workflows-image-models/)
<!-- AI_OUTPOST_LATEST_END -->

> 最新一期区块由 `pnpm.cmd content:update-readme` 自动替换。新一期发布后只更新这一处，不让公告在首页不断累积。

## 先从这里开始

| 你想做什么 | 推荐入口 |
| --- | --- |
| 直接阅读本周情报 | [AI 前哨站官网](https://rongnianxin.github.io/ai-outpost/) |
| 查看某一期的完整事实、影响和来源 | [官网历史归档](https://rongnianxin.github.io/ai-outpost/archive/) |
| 了解内容如何收集、核验和发布 | [内容生产流程](docs/CONTENT-OPS.md) |
| 运行本地预览或生成公众号稿包 | [快速开始](#快速开始) |
| 了解项目边界和长期安排 | [产品定义](docs/PRODUCT.md) · [版本路线](docs/ROADMAP.md) |

## 这是什么

AI 前哨站不是新闻链接堆积，也不追求覆盖所有 AI 动态。每期围绕少量值得关注的变化，分别回答：发生了什么、为什么重要、会影响谁、哪些地方仍不能确定，以及原始证据在哪里。

同一份结构化事实稿可以生成官网内容和微信公众号迁移稿；两种媒体按各自阅读场景排版，但共享期号、事实、来源和限制。官网是公开阅读主入口，GitHub 用于展示代码、流程和可复用方法。

## 每期内容的共同结构

| 层次 | 读者能得到什么 |
| --- | --- |
| 内容详情 | 经过整理的事件、产品或模型变化，保留时间、版本和主体。 |
| 造成的影响 | 说明对使用方式、价格、权限、协作或验收的实际影响。 |
| 限制与不确定性 | 区分官方说明、第三方线索、编辑判断和仍待确认的部分。 |
| 来源索引 | 提供可回溯的官方页面或原始材料，不用无出处的二手说法替代证据。 |

## 项目特色

- **少而有依据**：每期突出少量重点，不用标题数量制造信息量。
- **事实与判断分开**：先给读者可核对的事实，再解释影响和阅读优先级。
- **一稿多端**：官网、微信公众号使用同一事实底稿，分别适配网页和手机阅读。
- **发布前可验证**：内容 schema、来源链接、构建结果和本地预览都有对应检查。
- **边界清楚**：不自动发布外部平台，不把 AI 辅助整理写成作者亲测，也不把推测写成确定结论。

## 快速开始

### 本地预览

```powershell
pnpm.cmd install
pnpm.cmd dev
```

打开 `http://127.0.0.1:3100/` 查看官网；预览端口固定为 3100，避免和其他项目冲突。

### 校验内容和构建

```powershell
pnpm.cmd content:validate
pnpm.cmd content:check:links
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```

### 生成公众号迁移资料

```powershell
pnpm.cmd publish:prepare
pnpm.cmd publish:console
```

迁移控制页运行在 `http://127.0.0.1:3101/`，提供可复制正文、标题字段、原文链接、HTML/Markdown 和图片入口。公众号后台的保存、预览和发布仍由作者逐步确认。

### 同步首页最新一期提示

```powershell
pnpm.cmd content:update-readme
```

脚本只替换 `AI_OUTPOST_LATEST_START/END` 之间的一个区块，并拒绝缺少安全锚点或出现重复锚点的 README，避免新公告覆盖首页其他内容。

## 仓库结构

| 路径 | 用途 |
| --- | --- |
| `app/` | Next.js 官网页面、归档、详情和关于页。 |
| `content/` | 期刊 JSON、来源映射和内容 schema。 |
| `lib/` | 内容加载、校验、派生稿和发布资料生成。 |
| `scripts/` | 内容检查、预览、导出和 README 同步脚本。 |
| `docs/` | 产品、内容生产、推广、架构和交接规则。 |
| `tests/` | 内容、脚本和发布派生物的自动化测试。 |
| `exports/` | 本地生成的迁移资料，默认不纳入 Git。 |

常用文档：

- [当前任务状态](task_plan.md)
- [长期项目发现](findings.md)
- [当前进度摘要](progress.md)
- [产品定义](docs/PRODUCT.md)
- [版本路线](docs/ROADMAP.md)
- [技术架构](docs/ARCHITECTURE.md)
- [内容生产流程](docs/CONTENT-OPS.md)
- [推广与分发流程](docs/PROMOTION.md)
- [微信公众号标准交付](docs/PROMOTION.md#公众号标准交付与人工步骤)
- [项目工作流](docs/WORKFLOW.md)
- [仓库封面提示词](docs/README-COVER-PROMPT.md)

## 隐私与公开边界

- `.gitignore` 只能阻止 Git 跟踪指定文件，不是加密或访问控制。
- 私人文案、来源研究明细、任务 ID、凭据和本机状态不应进入公开仓库。
- 公开文章只保留必要的来源索引、限制说明和可复核的事实。
- 提交前核对 `git status`、暂存区差异和敏感信息扫描；不把未跟踪的私人目录一并加入提交。

## 设计说明

本首页借鉴成熟技术媒体常用的“中心化首屏 → 明确 CTA → 最新动态 → 读者路径 → 能力说明 → 快速开始 → 边界声明”节奏：先让访客知道项目是什么，再帮助他选择下一步。它没有照搬其他仓库面向复杂工作流的长篇章节，而是把 AI 前哨站最重要的内容可信度、官网入口和每期阅读路径放在前面。

仓库展示图已按参考仓库的首屏 Hero 结构，放置在项目标题、简介和徽章之后。封面提示词仍保存在 [README-COVER-PROMPT.md](docs/README-COVER-PROMPT.md)，但此前总结的固定生图方向目前暂缓采用，后续重新筛选后再制定规则。

## 许可证

本项目采用 [MIT License](LICENSE)。
