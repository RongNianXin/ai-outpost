# 第 001 期事实映射

## 事实与来源

| 卡片 | 已核查事实 | 来源 | 主要限制 |
| --- | --- | --- | --- |
| GitHub Agentic Workflows | 2026-06-11 进入公共预览，可用 Markdown 定义任务并编译为 Actions YAML。 | GitHub Changelog | 公共预览，不等于稳定生产能力。 |
| Anthropic Claude Fable 5 | 2026-06-09 发布，模型 ID 为 `claude-fable-5`，支持 1M 上下文和 128k 最大输出。 | Anthropic Release Notes | tokenizer、数据保留和拒答行为需要重新测试。 |
| OpenAI Web Search 图片结果 | 2026-06-09 Changelog 记录 Web Search 可返回图片结果。 | OpenAI API Changelog | 图片结果不等于自动拥有版权或商用授权。 |
| Google 多模态模型退役 | 2026-06-15 Release Notes 列出部分图像和视频模型退役计划。 | Google Gemini API Release Notes | 只影响公告列出的模型 ID。 |
| Cursor Bugbot /review | 2026-06-10 Changelog 记录 Bugbot 性能、成本和 `/review` 更新。 | Cursor Changelog | 指标来自 Cursor 官方自述。 |
| Cursor SDK custom tools | 2026-06-04 Changelog 记录 custom tools、auto-review、custom stores 和 nested subagents。 | Cursor Changelog | 面向 Cursor SDK 使用者，不等于普通用户必须立即接入。 |

## 事实分层

- 来源事实：厂商官方页面明确写出的发布时间、功能名、状态和限制。
- AI 分析：这些变化代表 Agent 正在进入工程流程，模型生命周期管理变得更重要。
- 行动建议：先学习和做清单，不建议直接购买、迁移或上线自动化。
