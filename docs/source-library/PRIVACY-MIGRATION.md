# 私有备份与历史清理

状态：本地迁移、一次独立私有备份及云端克隆恢复验证已完成。用户已最终授权下列22文件提交、快进推送和回读，执行结果见Git与本机.local/public-privacy-sync-receipt.json；未核对回执前不假定完成。历史未改写，旧公开数据仍可读取。备份仓库、版本、时间、哈希及权限证据仅记在.local/private-backup-receipt.json；当前令牌不能列出GitHub App安装权限，需主人在GitHub设置中补核。本机原始资料与Git对象保留。

## 私有备份执行方案

已在主人账户下建立独立private仓库，完成一次备份与恢复验证。备份仅含来源库目录与必要研究档案，不含整个.local、凭据、调度配置和账号索引。公开项目不设私库submodule，不在公开仓库的分支上放私密文件，不让公开CI取得私库令牌。

执行方法：核验登录为仓库主人→创建指定名称的private仓库→检查协作者及访问权限→审查待备份文件→在隔离备份目录建立独立Git并推送→以主人身份回读版本与文件哈希→匿名访问应失败→在临时目录克隆、恢复并运行加载检查。本次恢复检查已完成，App权限仍待主人核查；仅Push成功不等于恢复验收通过。

后续在每期完成、来源库实质变化和正式交接前触发备份检查，不新增调度。记录最后成功备份版本、时间与当前差异；远端写入仍需当次许可或另获明确限定的持续备份授权。建议再持有一份加密离线副本，密钥分开保管；密钥丢失不保证可恢复。同盘副本只防误编辑，不防磁盘损坏。

## 公开历史清理执行方案

### 本次已授权提交范围

基线main为 `c166b36cce3b66cc2e2ac16207b446ab3e8ded3b`。以下22文件包含来源私密化及此前关联的选题、交接门禁成果；用户已最终批准本次同步，保留其他成果。此授权不覆盖后续同步或历史清理。

```text
AGENTS.md
docs/AI-CONTENT-MARKET-RESEARCH-2026-09.md
docs/CONTENT-OPS.md
docs/PROMOTION.md
docs/WORKFLOW.md
docs/reviews/WECHAT-DELIVERY-LESSONS-2026-09-05.md
docs/source-library/README.md
docs/source-library/catalog.json
docs/source-library/PRIVACY-MIGRATION.md
findings.md
ops/runs/2026-W25.json
ops/runs/2026-W36-refresh-2026-09-05.json
ops/runs/2026-W36.json
package.json
progress.md
scripts/ops/research-start.checks.mjs
scripts/ops/research-start.mjs
scripts/ops/check-handoff-context.checks.mjs
scripts/ops/check-handoff-context.mjs
scripts/ops/check-source-privacy.checks.mjs
scripts/ops/check-source-privacy.mjs
task_plan.md
```

批准后先核对基线与文件内容、精确暂存并运行privacy:check，通过后才提交并快进推送main，回读远端空模板与脱敏版本。现有Pages工作流仅workflow_dispatch，禁止触发部署；历史清理、调度、平台写入均不在此范围。基线漂移或检查失败只暂停受影响动作。

### 历史清理需另行授权

先经授权提交、推送脱敏版本，可让最新文件不再携带数据，但历史依旧可读。不能据此宣称已经完全保密。

清理历史需单独最终确认：保留主人专用完整历史与未提交成果备份→盘点所有分支、标签、PR引用、Release附件、Actions产物和Pages→在隔离镜像中用git-filter-repo按受影响路径清理历史→重新加入已脱敏模块→扫描历史可达对象→确认影响后受控更新远端分支与标签→核验匿名读取及各类下载产物。不能直接在当前脏工作区改历史，也不能无差别mirror推送删除其他引用。

历史改写会改变提交ID，协作者需重新克隆或迁移成果；旧链接、PR、fork和缓存可能仍保留副本。无法控制的引用按GitHub执行时的支持政策处理，届时再核验；不能保证撤回他人已克隆、下载或截图的内容。临时将主仓库设为private可能影响Pages，也无法追回副本，须另行决定。

## 本地回滚

私密archive/pre-privacy保存原始文件与原相对路径，research-notes保存摘录和当前决定。逐项比对原始哈希后恢复受影响文件，不用reset --hard覆盖无关成果。若恢复真实数据到公开工作区，继续禁止提交和推送。
