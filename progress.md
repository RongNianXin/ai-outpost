# AI Outpost Progress

## 当前真实状态

- 项目已完成 V1 发布前构建版。
- 当前内容为第 001 期 2026-06-17 覆盖更新版。
- 第 001 期状态已切换为 `published`，`publishedAt` 为 `2026-06-18T00:00:00.000+08:00`，生产构建会生成正式期刊 slug。
- 最新保存点为 `6a672b1 refactor: improve source index and micro typography`。
- 当前工作流已对齐《工作流方案 2》，新增根目录文件化状态入口。
- 当前存在未保存修改：发布状态切换、GitHub Pages 链接检查步骤和发布前文档同步。

## 最近完成内容

- 移除首页首屏“打开独立期刊页面”按钮；首页已经展示完整最新一期，按钮只会跳到同内容固定 URL，容易造成“点击后没变化”的误解。
- 微调情报卡辅助文字字号，确保日期、标签、影响说明和策略建议不低于正文可读基线。
- 将首页从完整期刊页调整为最新一期导读页；详情页继续承载完整期刊，并新增返回首页导读入口。
- 首页 Hero 删除右侧数字统计卡，改为阅读时间、适合读者和本期核心主题。
- 首页新增“本周最大的影响”，用于解释本周新闻共同意味着什么；该模块是条件显示，不要求每期硬凑。
- 首页 CTA 改为“查看完整分析（6条情报）”，更明确地告诉用户点击后会进入完整详情页。
- 删除网页与公众号导出中的“可以尝试的小项目”和“本周实践 / 本周一个动作”板块，当前 V1 收敛为资讯阅读产品。
- 情报卡“策略建议”改为“阅读建议”，`try` 的前台表达改为“重点阅读”。
- 首页右侧新增“本期你会获得什么”，用于帮助用户决定是否进入详情页。
- 详情页右侧改为“阅读地图”，用于帮助用户按顺序完成深读。
- 详情页底部“原始来源”改为“来源索引”，每个来源会标注它支撑的情报卡。
- “来源索引”列表默认折叠，只保留说明与展开入口，减少详情页尾部链接噪音。
- 统一提升栏目标签、编号、日期、胶囊标签和辅助说明的小字号基线：12px 左右标签提升到约 13px，辅助说明提升到约 14px。
- 将第 001 期从 `approved` 切换为 `published`，填写 `publishedAt: 2026-06-18T00:00:00.000+08:00`，让生产构建生成正式期刊页面。
- GitHub Pages 工作流新增 `pnpm content:check:links` 步骤，手动部署时会执行发布前来源链接检查。
- 覆盖更新第 001 期内容，覆盖模型厂商、编程工具、Agent、RAG、MCP、多模态等范围。
- 完成 UI 视觉方向从早期控制台草案到 V1.2 阅读流精修。
- 情报卡默认压缩为结论、影响和阅读建议。
- 事实支撑、限制和来源链接改为默认折叠。
- 阅读建议改为更清楚的资讯处理词：先学习、重点阅读、持续观察、暂不处理。
- 已保存 Git commit：`9e922ae feat: refine issue content and reading flow`。
- 已打 Git tag：`v0.9.0-v1.2-reading-flow`。

## 最近验证结果

最近一次完整验证通过：

- `pnpm.cmd content:validate`
- `pnpm.cmd content:check:links`
- `pnpm.cmd content:export:wechat`
- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd test`
- `pnpm.cmd build`

已知说明：第 001 期切换为 `published` 前，生产构建只生成 `issues/__no-public-issues__`；当前发布准备版会生成正式期刊 slug。
链接检查说明：5 个官方来源中 GitHub、Anthropic、Cursor 返回 OK；OpenAI 返回 403、Google 超时，按防误杀规则记录为警告，不触发硬熔断。

本轮首页决策效率优化已额外通过：

- `pnpm.cmd content:validate`
- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd test`
- `pnpm.cmd build`

真实预览检查：本地首页返回 200；桌面和 375px 移动视口均无横向滚动；首页已显示“本周最大的影响”，旧数字统计卡已移除。

本轮资讯化收敛已额外通过：

- `pnpm.cmd content:validate`
- `pnpm.cmd content:export:wechat`
- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd test`
- `pnpm.cmd build`

真实预览检查：首页与详情页本地返回 200；详情页不再显示“可以尝试的小项目”“本周实践 / 本周一个动作”；`weekly-practice` 和 `small-projects` 锚点已从页面移除。

本轮阅读漏斗调整已额外通过：

- `pnpm.cmd content:validate`
- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd test`
- `pnpm.cmd build`

真实预览检查：首页显示“本期你会获得什么”，详情页显示“阅读地图”；桌面和 375px 移动视口均无横向滚动。

本轮来源索引优化已额外通过：

- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd build`

真实预览检查：详情页 `#source-list` 显示“来源索引”和“支撑情报”，并能看到来源与情报卡标题的映射关系。

本轮来源索引折叠优化已额外通过：

- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd build`

真实预览检查：来源索引默认收起；点击折叠入口后可展开官方来源与支撑情报映射；桌面视口无横向滚动。

本轮微型字号优化已额外通过：

- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd build`

真实预览检查：截图箭头所指的栏目标签、阅读地图标签、期刊状态和日期已从 12px 提升到 13px；375px 移动端主题胶囊为 14px；桌面和移动端均无横向滚动。

本轮发布状态切换已额外通过：

- `pnpm.cmd content:validate`
- `pnpm.cmd content:check:links`
- `pnpm.cmd content:export:wechat`
- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd test`
- `pnpm.cmd build`

验证结果：第 001 期为 `published`；生产构建生成 `/issues/2026-06-17-ai-agent-model-workflows/` 正式页面；首页和详情页本地 HTTP 均返回 200。链接检查仍有 OpenAI 403 与 Google 超时警告，按既定防误杀规则接受，不阻塞发布准备。

## 未完成事项

- 保存发布状态切换后的 Git 版本。
- 公开站点访问、深层链接和移动端最终验收。

## 当前阻塞项

- 自动化发布前检查已通过；下一步需要保存 Git 版本，然后人工登录 GitHub 触发 Pages 工作流或授权远端操作。

## 下一步建议

1. 保存 Git 版本。
2. 进入 GitHub Pages 手动部署流程。
3. 部署后检查公开地址、深层链接和移动端。

## 会话接手提示

新会话接手时先读取：

1. `task_plan.md`
2. `findings.md`
3. `progress.md`

然后只按当前任务读取必要文件，不默认扫描全仓库。
