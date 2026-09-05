# 第 003 期发布前检查

后续更新：下文保留发现问题时的快照。发送运行模式缺口已在同日获授权修复，见 [门禁修复报告](LOCAL-PUBLISH-GATE-REVIEW-2026-09-05.md)；工程尚未提交、公众号待配置仍有效，不再重复要求修复已解决问题。

检查日期：2026-09-05。范围：本地验证、来源复查、GitHub 只读查询、账号本机状态与代码审查。不发布、不提交、不推送、不修改运行模式。本报告是时间快照。

## 结论

本地内容与下载功能检查通过，但不建议立即使用发送按钮。用户已明确认可预览与资料包；这不等于最终发布授权。

## 阻断与待办

1. **发送安全门禁缺口**：ops/weekly-run-state.json 为 draft_only。lib/publishing/actions.ts 的 executePublishAction → executeWithLock 只检查确认句、重复回执、平台预检和部分官网公开状态；preflight.ts 和三个 adapter 未读取运行模式。server.ts 直接调用该入口。因而文档宣称的 draft_only / paused / emergency_stop 未形成发送层强制约束。当前没有执行外部写入；修复与回归测试需下一步授权。不能靠改成 normal 掩盖此问题。
2. **官网工程版本未保存**：检查时预检报告 39 项非期刊改动（文档整理后数量会增加）；未提交/未跟踪文件来自多轮已实现工作，不应删除。需分组核对、检查敏感文件后获得本地提交授权。保存本地后，推送/部署仍需最终单独确认。
3. **公众号未就绪**：getWechatConfig().configured=false，仅说明本机缺 AppID/AppSecret 配置；账号是否已申请待用户确认。草稿、接口资格、IP 白名单、发布与群发均未实测。

## 验证证据

- content:validate：3 期、9 类来源目录通过。
- content:check:links：21 条，16 成功，5 不确定（403/超时），无明确 404/5xx。新增 Astra 三来源正常。Google 两个本期页面另用网页工具成功打开，公告的 9 月 1 日条目仍可定位；这不消除命令行网络警告。来源：[更新日志](https://ai.google.dev/gemini-api/docs/changelog)、[视频理解文档](https://ai.google.dev/gemini-api/docs/video-understanding)。
- test：34/34 通过。typecheck 通过。lint：0 错误，1 条警告来自被 Git 忽略的浏览器测试脚本 output/playwright/check-pack.js 的函数表达式；非生产代码，不阻断构建，本轮未改代码消警。
- build：通过；自动下载校验仅输出 1 期公开 Markdown，无 002/003 泄露。003 最终生产发布状态尚未构建，本轮不修改状态来模拟发布。
- 派生包：manifest hash 与当前期刊一致，公众号 Markdown/HTML/封面、小红书文案/封面共 5 项存在；小红书标题 16 字符、正文 833 字符。这不是平台端验收。
- Git：main；本机 HEAD 与 git ls-remote 的 origin/main 均为 603b920688b5632ed971bedd93c9070625eb42da；GitHub 登录有效。未 fetch/push/commit。
- Pages：API 返回官网 https://rongnianxin.github.io/ai-outpost/ ，workflow 部署方式；最近一条部署记录成功，日期为 2026-06-18，不是本期部署。远端 issue-003 文件查询 404，与“本期未公开”一致，不是本期来源失效。
- 小红书：项目预检的 xhs status 返回成功；post --help 存在 --private；当前期刊版本 receipts 为空。本轮没发测试笔记，不能声称发帖已打通。
- 秘密边界：.env.local 没有列入 git ls-files，.env.local 与 .local/publish-state.json 受 ignore 保护；未读取或输出凭据值。这不是全仓库秘密扫描。
- 自动化：本机 ai-outpost 配置 ACTIVE、周六10:00；GitHub weekly ops 为 disabled_inactivity，未启用或触发。

## 后续最小执行顺序

1. 用户授权本地修复发送运行模式门禁；最小范围 actions/preflight 及测试，默认拒绝缺失/非法状态，不调用真实发送，确保本地生成和预览不被误阻断。
2. 核对并保存本地工程版本，输出提交范围与结果；仍不推送。
3. 用户最终明确确认第003期官网发布后，重新检查状态和来源、构建、推送/部署，等待完成，验证公开文章及 Markdown。
4. 再分别确认小红书私密测试、公开发布；公众号有账号后按实际权限接入或人工后台发布。

可接受风险：本机登录不是永久有效；单次来源访问受网络影响；未部署前不能验证公网资料包；本站没有独立复现实测文章中的模型实验。所有风险不得在对外文案中包装成已验证能力。
