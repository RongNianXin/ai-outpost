# 来源库模块与私密数据

本目录只公开通用方法和空白catalog.json模板。真实来源清单、内部评价、未定稿候选和研究明细保存在被Git忽略的 `.local/source-library/`，不得上传公开仓库、构建产物、日志附件或跨任务消息。已发表文章的必要证据引用继续公开。

## 本机加载与恢复

1. 从主人备份恢复私密目录的README.md、catalog.json、research-notes.md及引用资料。当前机器已完成迁移；克隆公开项目不会获得它们。
2. 运行 `pnpm.cmd content:research:start`。成功会在本机输出私密指南、目录和研究当前入口；截断须分段补读。禁止将输出送到公开CI或公开回执。
3. 缺失、空库、重复ID、损坏JSON或缺研究入口时停止检索，不退回公开模板或联网猜名单。网站构建及离线测试使用公开内容与虚构样本，不需要私密库。

来源字段沿用id、name、kind、entryUrl、language、topics、access、checkedOn、status、use、existingEvidenceCatalogId、identityEvidence、assessment、sensitivity、lastUsedIssue、nextReviewTrigger、fit。入口为HTTPS，ID唯一，未核验项如实登记。公开模板故意为空，不能冒充生产库。

## 通用方法

先查官方发布，再按主题参考研究、独立实践及社区。社区和媒体只发现线索，提炼问题并回溯原始公告、论文或实验。先筛AI相关性，不整站汇总无关话题；标签及热度不证明真实性，同源转述不算独立证据，活动时间不等于发布日。具体渠道的严格限制见私密指南。

评价相关性、可追溯性、准确克制、纠错与利益披露、信息增量及成本；保留证据与未知，不按粉丝量或推荐认定质量。主体与文章分别审查，不作永久安全保证。

新期开始、发布前后、交接收口及恢复时维护实际使用来源和资料指针，运行 `pnpm.cmd ops:check` 仅报告，不补跑或改调度。内部明细写私密research-notes，公开task_plan/findings/progress只记脱敏状态。交接运行manifest/check，核对私密版本指纹，不输出正文；私密资料缺失时生产交接不能通过。

## 公开前检查

运行 `pnpm.cmd privacy:check` 检查Git可发布文件及暂存区。迁移尚未暂存时旧索引会导致失败；本地验收可用 `-- --worktree-only`，不能当作暂存区通过。检查只是辅助，发布前仍审diff和构建产物。

.gitignore不清除已跟踪的历史，也不是加密。本轮未同步远端或改写历史，旧数据仍公开可取。本机目录权限不防管理员及已授权进程，换机后需重新设置。备份与历史清理见 [迁移方案](PRIVACY-MIGRATION.md)；同盘副本不抵御磁盘损坏，不备份整个.local。
