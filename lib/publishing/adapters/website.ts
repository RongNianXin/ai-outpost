import type { Issue } from "../../content/schema";
import { assertPublishingAllowed } from "../run-gate";

// Keep the old entry point fail-closed: it must never commit private issue inputs.
export async function publishWebsite(issue: Issue): Promise<{ externalId: string; detail: string }> {
  await assertPublishingAllowed(issue.id);
  throw new Error(`官网不再提交期刊文件到远端仓库。请按 docs/WORKFLOW.md 的本机公开产物部署通道发布 ${issue.id}；旧控制台发布入口已停用。`);
}
