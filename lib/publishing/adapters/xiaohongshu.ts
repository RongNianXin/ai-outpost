import { access } from "node:fs/promises";

import { commandSummary, runCommand } from "../commands";
import { assertPublishingAllowed } from "../run-gate";

export async function publishXiaohongshu(input: {
  issueId: string;
  title: string;
  body: string;
  imagePath: string;
  isPrivate: boolean;
}) {
  await assertPublishingAllowed(input.issueId);
  await access(input.imagePath);
  const args = [
    "post",
    "--title",
    input.title,
    "--body",
    input.body,
    "--images",
    input.imagePath,
  ];
  if (input.isPrivate) args.push("--private");
  args.push("--json");
  await assertPublishingAllowed(input.issueId);
  const result = await runCommand("xhs", args, { timeoutMs: 120_000 });
  if (!result.ok) {
    throw new Error(`小红书发布失败：${commandSummary(result)}`);
  }
  return {
    externalId: readExternalId(result.stdout),
    detail: input.isPrivate ? "小红书私密测试已创建" : "小红书笔记已公开提交",
  };
}

function readExternalId(stdout: string) {
  try {
    const payload = JSON.parse(stdout) as {
      data?: { note_id?: string; id?: string };
      note_id?: string;
      id?: string;
    };
    return (
      payload.data?.note_id ??
      payload.data?.id ??
      payload.note_id ??
      payload.id ??
      undefined
    );
  } catch {
    return undefined;
  }
}
