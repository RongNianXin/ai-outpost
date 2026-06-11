# 第 001 期来源真实性报告

核验角色：来源真实性 Agent  
核验日期：2026-06-11  
结果：7 个来源直接通过，2 个来源修正元数据后通过，0 个来源被判定为假冒。

## 通过来源

| 来源 ID | 结论 | 官方身份与日期依据 |
| --- | --- | --- |
| `openai-api-changelog` | PASS | OpenAI 官方开发者站；Changelog 明确列出 2026-06-04 更新。 |
| `github-copilot-sdk-ga` | PASS | GitHub 官方 Changelog；页面显示 2026-06-02。 |
| `github-copilot-sandbox-changelog` | PASS | GitHub 官方 Changelog；页面显示 2026-06-02，并明确标记公共预览。 |
| `github-copilot-billing` | PASS | GitHub 官方 Changelog；页面显示 2026-06-01。 |
| `github-copilot-usage-billing-docs` | PASS | GitHub 官方文档；最终地址属于 `docs.github.com`，页面说明套餐月度额度、AI Credits 用量记录和额外使用预算，页面未标注独立发布日期。 |
| `google-gemini-release-notes` | PASS | Google AI for Developers 官方站；Release Notes 有 2026-06-01 条目。 |
| `google-gemini-deprecations` | PASS | Google 官方文档；页面更新时间和模型表格均支持 2026-06-01。 |

## 修正后通过

| 来源 ID | 问题 | 修正 |
| --- | --- | --- |
| `openai-moderation-guide` | 官方文档没有显示发布日期。 | `publishedAt` 改为空，不再借用关联公告日期；标题改为页面实际标题。 |
| `github-copilot-sandbox-docs` | 官方文档没有显示发布日期。 | `publishedAt` 改为空，不再借用关联公告日期。 |

## 高风险内容的第二官方依据

- OpenAI 内容审核：API Changelog 与 Moderation 官方指南互相支持。
- GitHub 沙箱：Changelog 与 GitHub Docs互相支持。
- GitHub 计费：Changelog 与官方用量计费文档互相支持。
- Gemini 模型停止服务：Release Notes 与 Deprecations 表格互相支持。

## 结论

所有保留来源均能确认属于官方组织。两项问题属于日期元数据不严谨，不是来源身份造假。系统已经允许官方长期文档将发布日期明确留空。
