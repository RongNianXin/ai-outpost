# 技术架构

## 架构目标

- 低预算、低配置电脑可开发
- 无数据库、无长期运行服务器
- 内容可被构建时校验
- 网页和公众号共享同一事实源
- 后续可以逐步增加交互或迁移到服务端部署

## 技术栈

- Next.js 16、TypeScript、App Router
- CSS Modules 与全局设计变量
- Zod 校验 JSON 内容
- Vitest 测试内容规则与转换器
- GitHub Actions 构建并发布 GitHub Pages

## 数据流

```text
官方来源
  -> AI 候选与证据包
  -> AI 独立质检
  -> draft JSON
  -> Zod 校验
  -> 人工批准
  -> Next.js 网页 / 微信公众号 Markdown
  -> GitHub Pages
```

结构化 JSON 是唯一事实源。AI 先生成 `draft` JSON，多轮独立质检通过后将事实标记为 `ai_cross_checked`。发布者同意本地预览后记录 `previewApprovedAt` 并改为 `approved`；发布者再次明确批准公开后，才记录 `publicationApprovedAt` 与 `publishedAt` 并改为 `published`。转换器只能改变表达方式，不能创造新的硬事实。

本地开发模式会显示 `approved` 内容用于网页预览，公众号转换器也允许导出 `approved` 草稿；生产构建只包含 `published` 和 `corrected`。

## 页面路由

- `/`：最新一期
- `/archive/`：历史归档
- `/issues/[slug]/`：期刊详情
- `/about/`：方法、来源和审核原则

动态期刊路由使用 `generateStaticParams` 在构建时生成。

## 静态导出边界

项目配置 `output: "export"` 和 `trailingSlash: true`。V1 不使用：

- Cookie、Header 或依赖请求状态的页面
- Server Actions
- 动态 API Route
- ISR
- 运行时数据库
- 依赖 Next.js 服务端的默认图片优化

需要账号、私有数据或实时个性化时，再把部署迁移到支持 Next.js 服务器的平台。内容文件、组件和大部分路由可以继续使用。

## 组件原则

- 默认使用 Server Components，减少发送到浏览器的 JavaScript。
- 只有搜索、筛选等真实交互才使用 Client Components。
- 语义 HTML 优先，组件按内容职责拆分。
- 图片优先使用本地、明确授权的素材；V1 不依赖外部图片。

## GitHub Pages

构建输出目录为 `out/`。GitHub Actions负责安装依赖、校验内容、运行测试、构建和发布。部署工作流只允许手动触发，不会因推送 `main` 自动公开内容。当前工作流按 GitHub Pages 项目站点处理，使用仓库名作为 `basePath`。V1 尚未实现自定义域名切换；确定域名后再单独调整工作流。
