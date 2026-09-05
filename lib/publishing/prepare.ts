import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderWechatMarkdown } from "../content/wechat";
import type { Issue } from "../content/schema";
import { generatePlatformAssets } from "./assets";
import {
  getPublicIssueUrl,
  renderWechatHtml,
  renderXiaohongshuPost,
} from "./derivatives";

export async function preparePlatformPackage(issue: Issue) {
  const hash = getIssuePackageHash(issue);
  const assets = await generatePlatformAssets(issue);
  const wechatDirectory = path.join(process.cwd(), "exports", "wechat");
  const xhsDirectory = path.join(
    process.cwd(),
    "exports",
    "xiaohongshu",
    issue.slug,
  );
  const packageDirectory = path.join(
    process.cwd(),
    "exports",
    "publish",
    issue.slug,
  );
  await mkdir(packageDirectory, { recursive: true });

  const wechatMarkdown = path.join(wechatDirectory, `${issue.slug}.md`);
  const wechatHtml = path.join(wechatDirectory, `${issue.slug}.html`);
  const xhsText = path.join(xhsDirectory, "post.txt");
  const xhs = renderXiaohongshuPost(issue);

  await Promise.all([
    writeFile(wechatMarkdown, renderWechatMarkdown(issue), "utf8"),
    writeFile(wechatHtml, renderWechatHtml(issue), "utf8"),
    writeFile(xhsText, `${xhs.title}\n\n${xhs.body}\n`, "utf8"),
  ]);

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    issueId: issue.id,
    slug: issue.slug,
    issueNumber: issue.issueNumber,
    status: issue.status,
    hash,
    previewUrl: `http://127.0.0.1:3100/issues/${issue.slug}/`,
    publicUrl: getPublicIssueUrl(issue),
    files: {
      wechatMarkdown,
      wechatHtml,
      wechatCover: assets.wechatCover,
      xiaohongshuText: xhsText,
      xiaohongshuCover: assets.xiaohongshuCover,
    },
    xiaohongshu: xhs,
  };
  const manifestPath = path.join(packageDirectory, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return { ...manifest, manifestPath };
}

export function getIssuePackageHash(issue: Issue) {
  const normalized = {
    ...issue,
    status: "content-ready",
    publishedAt: null,
    editorial: {
      ...issue.editorial,
      publicationApprovedAt: null,
    },
  };
  return createHash("sha256")
    .update("ai-outpost-publish-package-v1\n")
    .update(JSON.stringify(normalized))
    .digest("hex");
}
