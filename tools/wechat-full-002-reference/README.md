# 第002期完整公众号排版源码参考

本目录保存2026-09-06从exports/wechat-full-002复制的逐字源码，供版本管理与交接复用；是否取得最新版本以Git提交为准，不能假定忽略目录exports随克隆取得。manifest.json的files按CRLF转LF后的UTF-8文本核对SHA256，originalSnapshotFiles仅保留原机字节指纹；这样Git跨系统换行不会造成假漂移。核对这两份参考源码，修改原件后须重新核验，不承诺永远相同。

运行逻辑：本地期刊JSON和主图→行内样式HTML→浏览器复制text/html及text/plain→人工粘贴微信；图片转上传占位，图片/阅读原文另设。不是抓取GitHub网页，不自动发布。

build.cjs依赖所在位置向上两层的项目根，读取content/issues/issue-002.json，要求002/6卡；署名、URL、输出文件、copy按钮文字均有固定值。运行会在脚本同目录覆盖full.html、hero.png、阅读原文地址.txt、发布字段.txt、verification-input.json。仅使用Node内置模块。serve.cjs绑定127.0.0.1:3193，仅GET/HEAD页面和主图。

不要在本参考目录直接生成。原002操作入口仍为项目根的node exports/wechat-full-002/build.cjs及node exports/wechat-full-002/serve.cjs，先备份已审稿；失败查看Expected complete issue 002/输入路径/端口冲突，不强改期号绕过。

跨项目只复制到独立工作区后审查并适配输入schema、期号、作者、URL、图片和输出目录；缺输入不可直接调用。需要已有结构化资讯且采用本模板时适用，任意Markdown/网站/长文需要适配，不保证原样视觉或平台永久保真。先核验全文来源/限制/图片占位与窄屏，再做获授权微信粘贴预览。未来通用化未在本轮实现。

本轮只做语法及哈希校验，未重新生成。详细人工步骤及历史实测见../../docs/reviews/WECHAT-DELIVERY-LESSONS-2026-09-05.md。
