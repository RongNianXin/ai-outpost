# AI Outpost Progress

## 2026-06-18 周更自动化验收清单落地

- 用户明确纠偏：当前不应审核第 002 期文案，应优先确认自动功能是否完成、如何验证、如何在 2026-06-20 17:00 前打通发布链路。
- 用户确认新的基建路线：GitHub Actions 定时任务作为云端运行内核，第三方微信推送服务作为第一阶段提醒通道。
- 已明确放弃本地计划任务和邮件提醒。
- 本周六目标改为：GitHub Actions 自动跑检索校验 -> 第三方服务推送微信通知 -> 用户确认后手动触发官网发布。
- 公众号、小红书、X/Twitter 第一阶段只生成文案草稿，由人工复制发布。
- 已完成三种微信推送服务初步判断：优先 Server酱 / Server酱³，备选 WxPusher，暂缓 PushDeer。
- 已记录 GitHub Actions 定时换算：北京时间周六 17:00 对应 UTC 09:00；因整点可能延迟，正式配置可考虑 17:05 或 17:07。
- 已新增 Server酱通知脚本：`scripts/notify/server-chan.ts`，只读取环境变量 `SERVER_CHAN_SENDKEY`，不把密钥写入仓库。
- 已新增 GitHub Actions workflow：`.github/workflows/weekly-ops.yml`，支持手动触发和每周六 17:05 北京时间定时运行。
- 已新增 package script：`pnpm.cmd notify:serverchan`。
- 当前等待用户把 sendkey 配置为 GitHub Secret：`SERVER_CHAN_SENDKEY`，然后在 GitHub Actions 手动触发 `AI Outpost weekly ops` 测试微信推送。
- 新增脚本后的验证结果：`typecheck`、`lint`、`test`、`content:validate`、`content:export:wechat`、`build` 均通过；生产构建仍只公开第 001 期。
- 已暂停失败的 Codex 2 分钟提醒测试：`AI Outpost 2分钟提醒测试`。
- 已新增 `docs/WEEKLY-AUTOMATION-ACCEPTANCE.md`，记录当前已完成能力、未完成能力、人工验证、自我验证、交叉 AI 验证、6 月 20 日发布目标和各平台待讨论事项。
- 当前判断：内容生成和自动校验已能演练；GitHub Actions 定时化、微信推送、一键确认、官网发布 workflow 尚未完成。
- 下一步建议：先选定 Server酱 / WxPusher / PushDeer 之一，做最小微信推送测试，再实现 GitHub Actions 定时草稿生成 workflow。

## 2026-06-18 第 002 期自动化演练完成到人工审核点

- 已创建运行状态文件：`ops/weekly-run-state.json` 和 `ops/runs/2026-W25.json`。
- 已生成第 002 期短版草稿：`content/issues/issue-002.json`，状态为 `approved`，仅用于本地预览。
- 已补充官方来源白名单：`content/sources.json` 增加 `https://cursor.com/changelog` 和 `https://commandline.microsoft.com/`。
- 已生成公众号 Markdown：`exports/wechat/2026-06-18-agent-discovery-cloud-agents-tts.md`。
- 已生成轻量分享包：`exports/social/2026-06-18-agent-discovery-cloud-agents-tts.md`。
- 已修复本地预览排序：`lib/content/repository.ts` 改为按真实时间排序，并新增测试覆盖同日 `approved` 草稿排序。
- 已启动本地开发服务器，预览页返回 200：`http://127.0.0.1:3100/issues/2026-06-18-agent-discovery-cloud-agents-tts/`。
- 自动校验结果：`content:validate`、`content:export:wechat`、`typecheck`、`lint`、`test`、`build` 均通过；`content:check:links` 通过但有警告，OpenAI 403 和 Google 页面超时/中止属于既有外部访问不确定项。
- 生产构建确认：只生成第 001 期公开详情页，第 002 期不会误上线。
- 当前状态：已停止在人工审核点；收到明确发布确认前，不应切换 `published`、提交 Git 或触发线上发布。

## 2026-06-18 稳定周更自动化规划落地

- 根据用户确认，项目下一阶段从“第 002 期内容生产任务包”进一步收敛为“稳定周更自动化”。
- 已确认优先级：官网主站优先、稳定内容生成优先、发布前人工确认、内容不足可短版或跳过。
- 已确认暂不优先做：微信公众号、小红书、X/Twitter 自动发布；尤其用户当前没有 X/Twitter 账号，也不希望前期被社媒平台复杂度拖住。
- 已更新规划文档：`docs/PRODUCT.md`、`docs/ROADMAP.md`、`docs/CONTENT-OPS.md`、`docs/ARCHITECTURE.md`、`docs/WORKFLOW.md`。
- 已更新交接判断：`task_plan.md` 与 `findings.md` 新增 V1.5 稳定周更自动化方向。
- 当前未执行代码修改、依赖安装、构建、测试或 Git 操作。
- 已新增第 002 期稳定周更任务包：`docs/ISSUE-002-WEEKLY-TASK-PACK.md`。
- 任务包已定义运行状态、运行日志、候选来源、筛选规则、AI 质检角色、预算控制、自动检查、确认摘要、发布后记录、短版/跳过规则和后续脚本化候选。
- 本轮仍未执行代码修改、依赖安装、构建、测试或 Git 操作。
- 下一步建议：优先实现或手动创建 `ops/weekly-run-state.json` 与 `ops/runs/<weekId>.json` 的最小结构，然后按任务包启动第 002 期候选收集。

## 2026-06-18 统一交接

- 本次交接原因：阶段完成并准备切换到新会话。
- 当前阶段是否完成：完成。V1 公开发布链路已完成。
- 新会话应该继续旧任务，还是进入新阶段：进入新阶段。
- 新阶段目标：准备第 002 期内容生产任务包，验证 AI 前哨站能否以低维护方式持续产出周报。
- 当前真实状态：第 001 期已发布；GitHub Pages 已重新部署；用户已验证网页端各项操作正常。
- 最新提交：`d7cf36f docs: add frontier concept observation rules`。
- 公开站点：[https://rongnianxin.github.io/ai-outpost/](https://rongnianxin.github.io/ai-outpost/)
- 本地开发地址：`http://127.0.0.1:3100/`。
- 修改过的关键文件：`content/issues/issue-001.json`、`components/IssueView.tsx`、`components/IntelCard.tsx`、`components/HomeIssueSummary.tsx`、相关 CSS Modules、`scripts/content/*`、`.github/workflows/deploy-pages.yml`、`docs/CONTENT-OPS.md`、`docs/PRODUCT.md`、`task_plan.md`、`findings.md`、`progress.md`。
- 最近验证结果：`content:validate`、`content:check:links`、`content:export:wechat`、`typecheck`、`lint`、`test`、`build` 均曾在发布准备阶段通过；用户已完成线上网页端人工验证。
- 未完成内容：第 002 期尚未启动；是否加入“前沿概念观察”需要在第 002 期选题时判断；暂未补 E2E 自动化测试。
- 当前阻塞项：无。
- 建议开发者现在检查的文件：`task_plan.md`、`findings.md`、`progress.md`、`docs/CONTENT-OPS.md`、`content/issues/issue-001.json`、`.github/workflows/deploy-pages.yml`。
- 是否建议开发者手动保存 Git：建议。此交接更新修改了根目录三个交接文件，本轮按要求不执行 Git 操作。

## 下一步行动

建议新会话直接开始“第 002 期内容生产任务包”：

1. 明确第 002 期时间窗口。
2. 定义候选来源范围：官方来源为主，专家/社区来源只用于 0-1 条前沿概念观察。
3. 设计 AI 收集、去重、事实映射、风险标注和发布前校验流程。
4. 暂不新增网站功能，除非第 002 期生产流程暴露出明确结构问题。

## 本轮内容策略补充
- 新增“前沿概念观察”规则：官方来源仍是主干，每期最多允许 1 条专家社区升温的新概念观察。
- 该规则只写入文档，不改页面、Schema 或第 001 期内容，避免把热度概念误包装成官方事实。

## 本轮锚点跳转修复
- 修复重点信号、阅读地图和来源索引等锚点跳转时被顶部粘性导航遮挡的问题。
- 技术处理：为页面滚动容器增加 `scroll-padding-top`，并保留章节标题和情报卡 `article` 的 `scroll-margin-top`，让浏览器跳转到锚点时自动预留导航高度。

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
