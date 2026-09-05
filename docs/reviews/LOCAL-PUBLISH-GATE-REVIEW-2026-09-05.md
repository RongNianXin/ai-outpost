# 本地发送门禁与待提交范围审查

日期：2026-09-05。授权范围：本地修复、测试、审查待提交范围。未提交、未推送、未发布，未改变 draft_only。

后续状态：用户随后明确授权“仅保存本地版本，不推送”；已进入精确范围核对与本地保存闭环。本文的“下一次授权”是当时历史建议，不再索要同一授权。最终提交回执在本机 .local/AI状态索引.md，发布前清单在 ../PROMOTION.md。

## 修复与依据

- run-gate.ts 统一读取 ops/weekly-run-state.json，不缓存。仅 normal、期刊ID匹配、requiresUserConfirmation=true 时放行；缺失/无法读取/坏JSON/非法模式均拒绝外部写入。
- actions.ts 在准备材料前和准备/平台检查后复核。preflight.ts 为所有平台显示模式检查，ready 不再只看登录和材料。
- website adapter 在入口、状态转换前、构建后暂存/提交前、推送前和部署触发前检查；微信在入口、上传封面和创建/发布前检查；小红书在入口及启动发帖命令前检查。
- 内部调用兼容性：publishWechatDraft 增加期刊ID参数；publishXiaohongshu 输入增加 issueId。仓库调用点已同步，类型检查通过。没有更改控制页请求字段或期刊结构。
- 本地材料生成、阅读、复制和下载没有接入发送门禁，不受 draft_only 影响。normal 不是最终授权，确认句、原有平台检查和重复回执继续有效。

## 验证

- 66 项测试通过：状态合法性/期刊错配/文件缺失及坏JSON/BOM/重读；五种动作的提前阻断、准备中暂停和正常确认；适配器直调阻断、官网构建中停止后的本地恢复、微信鉴权后停止上传、小红书启动前复核。
- 所有允许发送路径使用 mock（模拟）适配器、文件或命令，未调用真实发帖接口。真实本机仅运行只读状态检查，三平台都因 draft_only 返回 ready=false。
- typecheck、build及静态Markdown检查通过；lint零错误，有1条先前浏览器测试脚本的表达式警告（output目录，已被Git忽略），没有把它误报为生产代码错误。
- 已重启本项目控制页加载新代码，3100/3101健康；运行模式仍为draft_only。

## 对抗式审查与边界

- 已补上“文档有规定、发送层没执行”的缺口，没有靠切换normal绕过检查。
- 状态在操作边界重新读取，能阻止下一步，不能撤回已经提交的HTTP请求、Git push或正在运行的CLI。文件门禁不是分布式事务，也不能保证在最后一次检查与发出请求之间绝对无竞争。
- 若已推送后才紧急停止，阻断后续显式工作流触发不能撤销推送；仓库本身也可能有push触发。失败后必须核对远端状态，不应盲目重试。本轮未触发该场景。
- 门禁不改变用户本身使用git/第三方CLI的能力；它约束本项目发送流程，不是系统权限隔离。

## 待提交范围

检查时约70个修改/未跟踪文件（记录文件更新会改变数量），暂存区为空。它们包含此前多轮已授权成果，不能全称为本轮新改动。

| 分组 | 文件范围 | 处理建议 |
| --- | --- | --- |
| 工程功能 | components、lib/content、app/issues/.../brief.md、scripts/content | 保留页面/来源分类/资料包等已验收成果 |
| 发布准备与本轮门禁 | lib/publishing、scripts/publish-console、scripts/publish、scripts/start-preview.ps1、tests | 保留控制页和门禁测试，不能只提交新增guard而漏掉尚未跟踪的发送模块 |
| 内容与资产 | content/sources.json、issue-003.json、public/images/issues、ops/runs、weekly-run-state.json | 保持003为approved且publishedAt空、运行模式draft_only；两张主视觉分别是当前引用和历史资产，不擅自删旧图 |
| 配置与依赖 | package.json、pnpm-lock.yaml、.gitignore、.env.example | 新增sharp用于图像派生；保留配套锁文件。示例凭据为空，不包含真实值 |
| 文档 | AGENTS、README、docs、三份根记录、人工备忘录 | 保存现行推广入口及历史证据，注意不是授权放宽 |

建议下一次授权后保存一个完整的本地未发布检查点，而非强行拆成互相依赖但无法独立测试的提交。测试直接使用issue-003，所以工程/测试提交若漏掉该数据将不自洽。

排除：.env.local、.local回执/日志、exports、output/playwright、.playwright-cli、node_modules、.next、out。已检查关键忽略规则；候选文本中常见ghp/sk密钥和私钥头格式扫描未命中。此扫描不是全面秘密审计，不保证识别所有凭据格式。提交前应复核精确文件清单和最终暂存差异，不使用无审查git add .。

下一步：获得“仅保存本地版本”授权后核对名单并提交，继续不推送；真正发布时另行确认期号/版本/平台，按运行模式和发布检查推进。公众号配置与真实社媒测试仍未完成。
