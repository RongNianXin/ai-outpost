import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderWechatMarkdown } from "../content/wechat";
import { renderZhihuMarkdown } from "../content/zhihu";
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
  const zhihuDirectory = path.join(process.cwd(), "exports", "zhihu");
  await mkdir(packageDirectory, { recursive: true });
  await mkdir(zhihuDirectory, { recursive: true });

  const wechatMarkdown = path.join(wechatDirectory, `${issue.slug}.md`);
  const wechatHtml = path.join(wechatDirectory, `${issue.slug}.html`);
  const xhsText = path.join(xhsDirectory, "post.txt");
  const xhsManifestPath = path.join(xhsDirectory, "manifest.json");
  const xhs = renderXiaohongshuPost(issue);
  const zhihuMarkdownText = renderZhihuMarkdown(issue);
  const [zhihuTitleLine, , ...zhihuBodyLines] = zhihuMarkdownText.split("\n");
  const zhihu = {
    title: zhihuTitleLine.replace(/^#\s+/, ""),
    body: zhihuBodyLines.join("\n"),
  };
  const zhihuTitle = path.join(zhihuDirectory, `${issue.slug}-title.txt`);
  const zhihuBody = path.join(zhihuDirectory, `${issue.slug}-body.md`);
  const zhihuMarkdown = path.join(zhihuDirectory, `${issue.slug}.md`);
  const zhihuManifestPath = path.join(
    zhihuDirectory,
    issue.slug,
    "manifest.json",
  );

  await Promise.all([
    writeFile(wechatMarkdown, renderWechatMarkdown(issue), "utf8"),
    writeFile(wechatHtml, renderWechatHtml(issue), "utf8"),
    writeFile(xhsText, `${xhs.title}\n\n${xhs.body}\n`, "utf8"),
    writeFile(zhihuTitle, `${zhihu.title}\n`, "utf8"),
    writeFile(zhihuBody, `${zhihu.body}\n`, "utf8"),
    writeFile(zhihuMarkdown, zhihuMarkdownText, "utf8"),
  ]);

  const xhsImages = await Promise.all(
    assets.xiaohongshuImages.map(async (imagePath, index) => ({
      order: index + 2,
      name: path.basename(imagePath),
      path: imagePath,
      width: 1080,
      height: 1440,
      bytes: (await stat(imagePath)).size,
    })),
  );
  const xhsManifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    issueId: issue.id,
    slug: issue.slug,
    issueNumber: issue.issueNumber,
    hash,
    title: xhs.title,
    coverStatus: "awaiting_author" as const,
    postPath: xhsText,
    uploadOrder: xhsImages,
    checks: {
      expectedDimensions: "1080x1440",
      sequentialNames: xhsImages.every(
        (file, index) => file.name.startsWith(String(index + 2).padStart(2, "0")),
      ),
      imageCount: xhsImages.length,
    },
  };
  await writeFile(xhsManifestPath, `${JSON.stringify(xhsManifest, null, 2)}\n`, "utf8");
  const zhihuImages = await Promise.all(
    assets.zhihuImages.map(async (imagePath, index) => {
      const mixed = issue.id === "issue-005";
      return {
        order: index + 1,
        name: path.basename(imagePath),
        path: imagePath,
        placement: mixed
          ? `第 ${index === 0 ? 1 : 3} 条情报标题下方`
          : `第 ${index + 1} 条情报标题下方`,
        width: 1200,
        height: mixed ? (index === 0 ? 1080 : 1120) : 675,
        bytes: (await stat(imagePath)).size,
      };
    }),
  );
  await writeFile(
    zhihuManifestPath,
    `${JSON.stringify({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      issueId: issue.id,
      slug: issue.slug,
      issueNumber: issue.issueNumber,
      hash,
      title: zhihu.title,
      coverStatus: "awaiting_author",
      titlePath: zhihuTitle,
      bodyPath: zhihuBody,
      markdownPath: zhihuMarkdown,
      uploadOrder: zhihuImages,
    }, null, 2)}\n`,
    "utf8",
  );

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
      wechatSquareCover: assets.wechatSquareCover,
      xiaohongshuText: xhsText,
      xiaohongshuManifest: xhsManifestPath,
      xiaohongshuCover: assets.xiaohongshuCover,
      xiaohongshuImages: assets.xiaohongshuImages,
      zhihuTitle,
      zhihuBody,
      zhihuMarkdown,
      zhihuManifest: zhihuManifestPath,
      zhihuCover: assets.zhihuCover,
      zhihuImages: assets.zhihuImages,
    },
    xiaohongshu: xhs,
    zhihu,
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
