import { getPublishingStatus } from "./preflight";
import { preparePlatformPackage } from "./prepare";
import {
  appendPublishReceipt,
  findSuccessfulReceipt,
  type PublishAction,
  type PublishPlatform,
} from "./store";
import type { Issue } from "../content/schema";
import { createWechatDraft, publishWechatDraft } from "./adapters/wechat";
import { publishWebsite } from "./adapters/website";
import { publishXiaohongshu } from "./adapters/xiaohongshu";
import { assertPublishingAllowed } from "./run-gate";

const inFlight = new Set<string>();

export const actionLabels: Record<
  PublishAction,
  { platform: PublishPlatform; phrase: (issue: Issue) => string }
> = {
  website_publish: {
    platform: "website",
    phrase: (issue) => `发布官网第${issueLabel(issue)}期`,
  },
  wechat_draft: {
    platform: "wechat",
    phrase: (issue) => `创建公众号草稿第${issueLabel(issue)}期`,
  },
  wechat_publish: {
    platform: "wechat",
    phrase: (issue) => `发布公众号第${issueLabel(issue)}期`,
  },
  xiaohongshu_private: {
    platform: "xiaohongshu",
    phrase: (issue) => `发布小红书私密测试第${issueLabel(issue)}期`,
  },
  xiaohongshu_publish: {
    platform: "xiaohongshu",
    phrase: (issue) => `公开发布小红书第${issueLabel(issue)}期`,
  },
};

export async function executePublishAction(
  issue: Issue,
  action: PublishAction,
  confirmation: string,
) {
  const definition = actionLabels[action];
  if (!definition) throw new Error("未知发布动作。");
  const expected = definition.phrase(issue);
  if (confirmation.trim() !== expected) {
    throw new Error(`确认句不匹配；请输入“${expected}”。`);
  }

  const lockKey = `${issue.id}:${action}`;
  if (inFlight.has(lockKey)) {
    throw new Error("同一平台动作正在执行，已阻止重复请求。");
  }
  inFlight.add(lockKey);

  try {
    await assertPublishingAllowed(issue.id);
    return await executeWithLock(issue, action, definition.platform);
  } finally {
    inFlight.delete(lockKey);
  }
}

async function executeWithLock(
  issue: Issue,
  action: PublishAction,
  platformName: PublishPlatform,
) {

  const prepared = await preparePlatformPackage(issue);
  const previous = await findSuccessfulReceipt(issue.id, prepared.hash, action);
  if (previous) {
    throw new Error(`同一内容已执行过该动作（${previous.createdAt}），已阻止重复发送。`);
  }
  const status = await getPublishingStatus(issue);
  const platform = status.platforms.find(
    (candidate) => candidate.platform === platformName,
  );
  if (!platform?.ready) {
    const failed = platform?.checks
      .filter((check) => !check.ok)
      .map((check) => check.detail)
      .join("；");
    throw new Error(`平台预检未通过：${failed || "未知原因"}`);
  }

  let externalId: string | undefined;
  let detail = "";
  await assertPublishingAllowed(issue.id);
  if (action === "website_publish") {
    ({ externalId, detail } = await publishWebsite(issue));
  } else if (action === "wechat_draft") {
    externalId = await createWechatDraft(
      issue,
      prepared.files.wechatHtml,
      prepared.files.wechatCover,
    );
    detail = "公众号草稿已创建；请先在后台预览，再决定是否正式发布";
  } else if (action === "wechat_publish") {
    assertWebsiteIsPublic(issue, "公众号文章");
    const draft = await findSuccessfulReceipt(
      issue.id,
      prepared.hash,
      "wechat_draft",
    );
    if (!draft?.externalId) {
      throw new Error("找不到与当前内容一致的公众号草稿，请先创建草稿。");
    }
    externalId = await publishWechatDraft(draft.externalId, issue.id);
    detail = "公众号草稿已提交发布；平台仍可能处于发布处理中";
  } else {
    if (action === "xiaohongshu_publish") {
      assertWebsiteIsPublic(issue, "小红书笔记");
    }
    const result = await publishXiaohongshu({
      issueId: issue.id,
      title: prepared.xiaohongshu.title,
      body: prepared.xiaohongshu.body,
      imagePath: prepared.files.xiaohongshuCover,
      isPrivate: action === "xiaohongshu_private",
    });
    externalId = result.externalId;
    detail = result.detail;
  }

  return appendPublishReceipt({
    issueId: issue.id,
    issueHash: prepared.hash,
    platform: platformName,
    action,
    status: "succeeded",
    externalId,
    detail,
  });
}

export function getConfirmationPhrases(issue: Issue) {
  return Object.fromEntries(
    Object.entries(actionLabels).map(([action, definition]) => [
      action,
      definition.phrase(issue),
    ]),
  );
}

function issueLabel(issue: Issue) {
  return String(issue.issueNumber).padStart(3, "0");
}

function assertWebsiteIsPublic(issue: Issue, target: string) {
  if (!new Set(["published", "corrected"]).has(issue.status)) {
    throw new Error(`${target}含官网原文链接，请先发布官网。`);
  }
}
