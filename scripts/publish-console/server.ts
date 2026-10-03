import { randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import MarkdownIt from "markdown-it";

import { getAllIssues } from "../../lib/content/repository";
import type { Issue } from "../../lib/content/schema";
import {
  executePublishAction,
  getConfirmationPhrases,
} from "../../lib/publishing/actions";
import { loadLocalEnvironment } from "../../lib/publishing/config";
import { getPublishingStatus } from "../../lib/publishing/preflight";
import { getIssuePackageHash, preparePlatformPackage } from "../../lib/publishing/prepare";
import { generateZhihuMixedVisuals } from "../../lib/publishing/zhihu-mixed-visuals";
import type { PublishAction } from "../../lib/publishing/store";
import { exportImagesToDirectory } from "../../lib/publishing/export-images";
import {
  exportFilesToDirectory,
  type ExportFile,
  type ExportPlatform,
} from "../../lib/publishing/export-package";

const host = "127.0.0.1";
const port = readNumberArgument("--port") ?? 3101;
const requestedSlug = readArgument("--slug") ?? "";
const assetDirectory = path.join(process.cwd(), "scripts", "publish-console");
const sessionToken = randomBytes(32).toString("hex");
const zhihuPreviewMarkdown = new MarkdownIt({ html: false, linkify: false });
const zhihuMixedVisualCache = new Map<string, Promise<Map<number, string>>>();
const allowedActions = new Set<PublishAction>([
  "website_publish",
  "wechat_draft",
  "wechat_publish",
  "xiaohongshu_private",
  "xiaohongshu_publish",
]);
const exportPlatforms = new Set<ExportPlatform>(["xiaohongshu", "wechat", "zhihu"]);

loadLocalEnvironment();

const preparedPackageCache = new Map<
  string,
  ReturnType<typeof preparePlatformPackage>
>();

function prepareCachedPackage(issue: Issue) {
  const cached = preparedPackageCache.get(issue.slug);
  if (cached) return cached;
  const preparing = preparePlatformPackage(issue).catch((error) => {
    preparedPackageCache.delete(issue.slug);
    throw error;
  });
  preparedPackageCache.set(issue.slug, preparing);
  return preparing;
}

const server = createServer(async (request, response) => {
  try {
    setSecurityHeaders(response);
    const url = new URL(request.url ?? "/", `http://${host}:${port}`);
    if (request.method === "POST" && url.pathname === "/api/export-images") {
      assertMutationRequest(request);
      const body = await readJsonBody(request);
      const { selected } = await selectIssue(requireSlug(body.slug));
      const prepared = await prepareCachedPackage(selected);
      return sendJson(response, 200, await exportImagesToDirectory(
        readString(body.directory), prepared.files.xiaohongshuImages, selected.issueNumber,
      ));
    }
    if (request.method === "POST" && url.pathname === "/api/export-package") {
      assertMutationRequest(request);
      const body = await readJsonBody(request);
      const platform = readString(body.platform);
      if (!exportPlatforms.has(platform)) throw new HttpError(400, "未知资料平台。");
      const { selected } = await selectIssue(requireSlug(body.slug));
      const prepared = await prepareCachedPackage(selected);
      return sendJson(response, 200, await exportFilesToDirectory(
        readString(body.directory),
        getPlatformExportFiles(prepared.files, platform),
        selected.issueNumber,
        platform,
      ));
    }
    if (request.method === "GET" && url.pathname === "/") {
      return serveIndex(response);
    }
    if (request.method === "GET" && url.pathname === "/style.css") {
      return serveStaticFile(response, path.join(assetDirectory, "style.css"), "text/css; charset=utf-8");
    }
    if (request.method === "GET" && url.pathname === "/app.js") {
      return serveStaticFile(response, path.join(assetDirectory, "app.js"), "text/javascript; charset=utf-8");
    }
    if (request.method === "GET" && url.pathname === "/preview.js") {
      return serveStaticFile(response, path.join(assetDirectory, "preview.js"), "text/javascript; charset=utf-8");
    }
    if (request.method === "GET" && url.pathname === "/api/status") {
      assertSession(request);
      const { issues, selected } = await selectIssue(url.searchParams.get("slug"));
      const status = await getPublishingStatus(selected);
      return sendJson(response, 200, {
        issues: issues.map((issue) => ({
          slug: issue.slug,
          issueNumber: issue.issueNumber,
          status: issue.status,
        })),
        selected: status.issue,
        platforms: status.platforms,
        receipts: status.receipts,
        confirmationPhrases: getConfirmationPhrases(selected),
      });
    }
    if (request.method === "POST" && url.pathname === "/api/prepare") {
      assertMutationRequest(request);
      const body = await readJsonBody(request);
      const slug = requireSlug(body.slug);
      const { selected } = await selectIssue(slug);
      const prepared = await prepareCachedPackage(selected);
      return sendJson(response, 200, {
        manifestPath: prepared.manifestPath,
        hash: prepared.hash,
      });
    }
    if (request.method === "POST" && url.pathname === "/api/action") {
      assertMutationRequest(request);
      const body = await readJsonBody(request);
      const action = readString(body.action) as PublishAction;
      if (!allowedActions.has(action)) throw new HttpError(400, "未知发布动作。");
      const { selected } = await selectIssue(requireSlug(body.slug));
      const receipt = await executePublishAction(
        selected,
        action,
        readString(body.confirmation),
      );
      return sendJson(response, 200, receipt);
    }
    if (request.method === "GET" && url.pathname === "/preview/wechat") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      const content = await readFile(prepared.files.wechatHtml, "utf8");
      return sendHtml(response, renderWechatPreview(
        selected,
        content,
        Boolean(prepared.files.wechatCover),
        getPlatformExportFiles(prepared.files, "wechat").length,
      ));
    }
    if (request.method === "GET" && url.pathname === "/download/wechat-html") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      return serveStaticFile(response, prepared.files.wechatHtml, "text/html; charset=utf-8", false, "attachment");
    }
    if (request.method === "GET" && url.pathname === "/download/wechat-md") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      return serveStaticFile(response, prepared.files.wechatMarkdown, "text/markdown; charset=utf-8", false, "attachment");
    }
    if (request.method === "GET" && url.pathname === "/download/wechat-cover") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      if (!prepared.files.wechatCover) throw new HttpError(404, "封面待作者另行设计。");
      return serveStaticFile(response, prepared.files.wechatCover, "image/jpeg", false, "attachment");
    }
    if (request.method === "GET" && url.pathname === "/download/wechat-cover-square") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      if (!prepared.files.wechatSquareCover) throw new HttpError(404, "封面待作者另行设计。");
      return serveStaticFile(response, prepared.files.wechatSquareCover, "image/jpeg", false, "attachment");
    }
    if (request.method === "GET" && url.pathname === "/preview/wechat-cover") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      const variant = url.searchParams.get("variant") === "square" ? "square" : "wide";
      const cover = variant === "square" ? prepared.files.wechatSquareCover : prepared.files.wechatCover;
      if (!cover) throw new HttpError(404, "封面待作者另行设计。");
      return serveStaticFile(response, cover, "image/jpeg", false);
    }
    if (request.method === "GET" && url.pathname === "/preview/xiaohongshu") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      return sendHtml(response, renderXhsPreview(
        selected,
        prepared.xiaohongshu,
        prepared.files.xiaohongshuImages.length,
        Boolean(prepared.files.xiaohongshuCover),
        getPlatformExportFiles(prepared.files, "xiaohongshu").length,
      ));
    }
    if (request.method === "GET" && url.pathname === "/preview/xhs-image") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      const index = Number(url.searchParams.get("index"));
      const imagePath = prepared.files.xiaohongshuImages[index];
      if (!Number.isInteger(index) || !imagePath) throw new HttpError(404, "没有这张小红书图片。");
      return serveStaticFile(response, imagePath, "image/jpeg", false);
    }
    if (request.method === "GET" && url.pathname === "/preview/zhihu") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      return sendHtml(
        response,
        renderZhihuPreview(
          selected,
          prepared.zhihu,
          prepared.files.zhihuIllustrations.length,
          Boolean(prepared.files.zhihuCover),
          getPlatformExportFiles(prepared.files, "zhihu").length,
        ),
      );
    }
    if (request.method === "GET" && url.pathname === "/preview/zhihu-mixed") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      const visuals = await getZhihuMixedVisuals(selected);
      return sendHtml(
        response,
        renderZhihuMixedPreview(
          selected,
          prepared.zhihu,
          visuals,
          getPlatformExportFiles(prepared.files, "zhihu", [...visuals.values()].map((file, index) => ({
            path: file,
            name: `${String(index + 1).padStart(2, "0")}-infographic.jpg`,
          }))).length,
        ),
      );
    }
    if (request.method === "GET" && url.pathname === "/preview/zhihu-mixed-image") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const index = Number(url.searchParams.get("index"));
      const imagePath = Number.isInteger(index)
        ? (await getZhihuMixedVisuals(selected)).get(index)
        : undefined;
      if (!imagePath) throw new HttpError(404, "没有这张图文混排配图。");
      return serveStaticFile(response, imagePath, "image/jpeg", false);
    }
    if (request.method === "GET" && url.pathname === "/download/zhihu-md") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      return serveStaticFile(
        response,
        prepared.files.zhihuMarkdown,
        "text/markdown; charset=utf-8",
        false,
        "attachment",
      );
    }
    if (request.method === "GET" && url.pathname === "/preview/zhihu-image") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      const index = Number(url.searchParams.get("index"));
      const imagePath = prepared.files.zhihuIllustrations[index];
      if (!Number.isInteger(index) || !imagePath) {
        throw new HttpError(404, "本期没有这张知乎插图。");
      }
      return serveStaticFile(response, imagePath, "image/jpeg", false);
    }
    return sendJson(response, 404, { error: "没有这个页面。" });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = sanitizeError(
      error instanceof Error ? error.message : "未知错误。",
    );
    sendJson(response, statusCode, { error: message });
  }
});

server.on("error", (error) => {
  console.error(`发布控制页启动失败：${sanitizeError(error.message)}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  const slugQuery = requestedSlug ? `?slug=${encodeURIComponent(requestedSlug)}` : "";
  console.log(`AI Outpost 本机发布控制页：http://${host}:${port}/${slugQuery}`);
  console.log("页面仅绑定 127.0.0.1；关闭此终端即可停止控制页。");
});

process.once("SIGINT", () => server.close());
process.once("SIGTERM", () => server.close());

async function selectIssue(slug: string | null) {
  const issues = (await getAllIssues())
    .filter((issue) => ["approved", "published", "corrected"].includes(issue.status))
    .sort((a, b) => b.issueNumber - a.issueNumber);
  if (issues.length === 0) throw new HttpError(404, "没有可预览的期刊。");
  const selected = slug
    ? issues.find((issue) => issue.slug === slug)
    : issues[0];
  if (!selected) throw new HttpError(404, "找不到指定期刊。");
  return { issues, selected };
}

async function serveIndex(response: ServerResponse) {
  const source = await readFile(path.join(assetDirectory, "index.html"), "utf8");
  const html = source
    .replace("__SESSION_TOKEN__", sessionToken)
    .replace("__DEFAULT_SLUG__", escapeHtml(requestedSlug));
  return sendHtml(response, html);
}

async function serveStaticFile(
  response: ServerResponse,
  filePath: string,
  contentType: string,
  cache = true,
  disposition?: "attachment",
) {
  const info = await stat(filePath);
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": info.size,
    "Cache-Control": cache ? "no-cache" : "no-store",
    ...(disposition ? { "Content-Disposition": disposition } : {}),
  });
  createReadStream(filePath).pipe(response);
}

function assertSession(request: IncomingMessage) {
  const supplied = request.headers["x-outpost-token"];
  if (typeof supplied !== "string" || !safeEqual(supplied, sessionToken)) {
    throw new HttpError(403, "本机会话令牌无效，请刷新控制页。");
  }
}

function assertMutationRequest(request: IncomingMessage) {
  assertSession(request);
  const origin = request.headers.origin;
  const expected = new Set([
    `http://${host}:${port}`,
    `http://localhost:${port}`,
  ]);
  if (typeof origin !== "string" || !expected.has(origin)) {
    throw new HttpError(403, "请求来源不匹配，已阻止平台写入。");
  }
  const contentType = request.headers["content-type"] ?? "";
  if (!String(contentType).startsWith("application/json")) {
    throw new HttpError(415, "只接受 JSON 请求。");
  }
}

async function readJsonBody(request: IncomingMessage) {
  let raw = "";
  for await (const chunk of request) {
    raw += Buffer.from(chunk).toString("utf8");
    if (Buffer.byteLength(raw, "utf8") > 64 * 1024) {
      throw new HttpError(413, "请求内容过大。");
    }
  }
  try {
    return JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "JSON 格式不正确。");
  }
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": payload.byteLength,
    "Cache-Control": "no-store",
  });
  response.end(payload);
}

function sendHtml(response: ServerResponse, html: string) {
  const payload = Buffer.from(html);
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": payload.byteLength,
    "Cache-Control": "no-store",
  });
  response.end(payload);
}

function setSecurityHeaders(response: ServerResponse) {
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Frame-Options", "DENY");
}

type PreparedFiles = {
  wechatHtml: string;
  wechatMarkdown: string;
  wechatCover: string | null;
  wechatSquareCover: string | null;
  xiaohongshuText: string;
  xiaohongshuManifest: string;
  xiaohongshuCover: string | null;
  xiaohongshuImages: string[];
  zhihuTitle: string;
  zhihuBody: string;
  zhihuMarkdown: string;
  zhihuManifest: string;
  zhihuCover: string | null;
  zhihuIllustrations: string[];
};

function getPlatformExportFiles(
  files: PreparedFiles,
  platform: ExportPlatform,
  extraFiles: ExportFile[] = [],
): ExportFile[] {
  const result: ExportFile[] = [];
  const add = (source: string | null | undefined, name: string) => {
    if (source) result.push({ path: source, name });
  };
  if (platform === "xiaohongshu") {
    add(files.xiaohongshuText, "post.txt");
    add(files.xiaohongshuManifest, "manifest.json");
    add(files.xiaohongshuCover, "01-cover.jpg");
    files.xiaohongshuImages.forEach((file, index) => add(file, `${String(index + 2).padStart(2, "0")}-carousel.jpg`));
  } else if (platform === "wechat") {
    add(files.wechatHtml, "article.html");
    add(files.wechatMarkdown, "article.md");
    add(files.wechatCover, "cover-wide.jpg");
    add(files.wechatSquareCover, "cover-square.jpg");
  } else if (platform === "zhihu") {
    add(files.zhihuTitle, "title.txt");
    add(files.zhihuBody, "body.md");
    add(files.zhihuMarkdown, "article.md");
    add(files.zhihuManifest, "manifest.json");
    add(files.zhihuCover, "cover.jpg");
    files.zhihuIllustrations.forEach((file, index) => add(file, `${String(index + 1).padStart(2, "0")}-illustration.jpg`));
  } else {
    throw new HttpError(400, "未知资料平台。");
  }
  return result.concat(extraFiles);
}

function renderPackageExportForm(issue: Issue, platform: ExportPlatform, label: string, fileCount: number) {
  return `<form class="package-export" data-slug="${escapeHtml(issue.slug)}" data-token="${sessionToken}" data-endpoint="/api/export-package" data-platform="${escapeHtml(platform)}"><label for="export-directory-${escapeHtml(platform)}">保存${label}资料到文件夹</label><input id="export-directory-${escapeHtml(platform)}" required placeholder="粘贴已存在文件夹的完整路径" style="display:block;width:min(100%,560px);padding:10px;margin:10px 0;"><p style="margin:0 0 10px;color:#5d6b82;line-height:1.6;">填写父文件夹即可；程序会创建本期 ${label} 独立目录，保存 ${fileCount} 个文件，不覆盖旧稿。</p><button type="submit">一键保存全部${label}资料</button><p class="export-status" role="status" style="overflow-wrap:anywhere;white-space:pre-wrap"></p><button type="button" class="copy-export-path" hidden>复制已保存目录</button></form>`;
}

function renderWechatPreview(issue: Issue, content: string, hasCover: boolean, packageFileCount: number) {
  const query = encodeURIComponent(issue.slug);
  const originalUrl = `https://rongnianxin.github.io/ai-outpost/issues/${issue.slug}/`;
  const summary = issue.summary;
  const displayTitle = `${issue.title}｜${issue.hero?.coverTitle ?? issue.hero?.lead ?? "本周重点"}`;
  const field = (label: string, value: string) => `<div style="display:grid;grid-template-columns:72px 1fr auto;gap:8px;align-items:center;margin:8px 0;"><strong style="font-size:13px;">${label}</strong><code style="padding:8px;background:#f3f7f8;word-break:break-all;">${escapeHtml(value)}</code><button data-copy-value="${escapeHtml(value)}" style="min-height:34px;padding:0 10px;border:1px solid #168c7b;background:#fff;color:#168c7b;cursor:pointer;">复制</button></div>`;
  const exportForm = renderPackageExportForm(issue, "wechat", "微信", packageFileCount);
  if (issue.issueNumber === 0 || issue.issueNumber >= 6) {
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>公众号迁移交付｜${escapeHtml(displayTitle)}</title></head><body style="margin:0;background:#eef3f5;color:#172333;font-family:Microsoft YaHei,sans-serif;"><header style="position:sticky;top:0;z-index:2;padding:12px;background:#102131;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-target="#wechat-article" style="min-height:40px;padding:0 18px;border:0;background:#35d0ba;color:#102131;font-weight:700;cursor:pointer;">复制完整正文</button><a href="/download/wechat-html?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载 HTML</a><a href="/download/wechat-md?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载 Markdown</a></header><main style="max-width:900px;margin:28px auto;padding:0 18px 48px;"><section style="padding:22px;background:#fff;border:1px solid #cbd9df;"><p style="margin:0 0 8px;color:#168c7b;font-size:13px;">公众号迁移交付页 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期 · 本机可访问</p><h1 style="margin:0 0 12px;font-size:26px;line-height:1.4;">${escapeHtml(displayTitle)}</h1>${field("标题", displayTitle)}${field("作者", "暮雨笙")}${field("摘要", summary)}${field("原文链接", originalUrl)}<p style="color:#486071;line-height:1.75;">正文可直接复制粘贴。封面由作者另行设计；正文主图可选，需要时在平台编辑器中自行选择位置，不必删除任何占位文字。</p>${exportForm}</section><section style="margin-top:24px;padding:24px;background:#fff;"><article id="wechat-article">${content}</article></section></main><script src="/preview.js"></script></body></html>`;
  }
  if (!hasCover) return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>公众号迁移交付｜${escapeHtml(displayTitle)}</title></head><body style="margin:0;background:#eef3f5;color:#172333;font-family:Microsoft YaHei,sans-serif;"><header style="position:sticky;top:0;z-index:2;padding:12px;background:#102131;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-target="#wechat-article" style="min-height:40px;padding:0 18px;border:0;background:#35d0ba;color:#102131;font-weight:700;cursor:pointer;">复制完整正文</button><a href="/download/wechat-html?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载 HTML</a><a href="/download/wechat-md?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载 Markdown</a></header><main style="max-width:900px;margin:28px auto;padding:0 18px 48px;"><section style="padding:22px;background:#fff;border:1px solid #cbd9df;"><p style="margin:0 0 8px;color:#168c7b;font-size:13px;">公众号迁移交付页 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期 · 本机可访问</p><h1 style="margin:0 0 12px;font-size:26px;line-height:1.4;">${escapeHtml(displayTitle)}</h1>${field("标题", displayTitle)}${field("作者", "暮雨笙")}${field("摘要", summary)}${field("原文链接", originalUrl)}<p style="padding:12px;background:#fff8e8;color:#7a4a00;line-height:1.75;">封面待作者另行设计。本页不生成、不展示封面；请勿使用旧稿包中的自动封面。正文主图插入位置已标明，取得审定图片后再上传。</p>${exportForm}</section><section style="margin-top:24px;padding:24px;background:#fff;"><article id="wechat-article">${content}</article></section></main><script src="/preview.js"></script></body></html>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>公众号迁移交付｜${escapeHtml(displayTitle)}</title></head><body style="margin:0;background:#eef3f5;color:#172333;font-family:Microsoft YaHei,sans-serif;"><div style="position:sticky;top:0;z-index:2;padding:12px;text-align:center;background:#102131;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-target="#wechat-article" style="min-height:40px;padding:0 18px;border:0;background:#35d0ba;color:#102131;font-weight:700;cursor:pointer;">复制完整正文</button><a href="/download/wechat-html?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载 HTML</a><a href="/download/wechat-md?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载 Markdown</a><a href="/download/wechat-cover?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载横版封面 2.35:1</a><a href="/download/wechat-cover-square?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载方形封面 1:1</a></div><main style="max-width:900px;margin:28px auto;padding:0 18px 48px;"><section style="padding:22px;background:#fff;border:1px solid #cbd9df;box-shadow:0 18px 50px rgba(20,45,59,.08);"><p style="margin:0 0 8px;color:#168c7b;font-size:13px;">公众号迁移交付页 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</p><h1 style="margin:0 0 12px;font-size:30px;line-height:1.35;">${escapeHtml(displayTitle)}</h1><p style="margin:0;color:#486071;line-height:1.7;">本地封面仅供排版预览，最终摄影封面尚待替换；这里不会写入公众号后台。</p>${field("标题", displayTitle)}${field("作者", "暮雨笙")}${field("摘要", summary)}${field("原文链接", originalUrl)}<p style="margin:16px 0 0;color:#486071;font-size:13px;line-height:1.7;">迁移顺序：复制字段 → 复制完整正文 → 上传审定主图并删除插入提示 → 按平台需要上传封面 → 在后台单独填写原文链接 → 保存草稿 → 手机预览。发布和群发仍需另行确认。</p>${exportForm}</section><section style="margin-top:24px;padding:22px;background:#fff;box-shadow:0 18px 50px rgba(20,45,59,.08);"><h2 style="margin:0 0 16px;font-size:22px;">本地候选封面，尚待最终替换</h2><div style="display:grid;grid-template-columns:minmax(0,2.35fr) minmax(220px,1fr);gap:20px;align-items:start;"><figure style="margin:0;"><img src="/preview/wechat-cover?slug=${query}&variant=wide" alt="第 ${String(issue.issueNumber).padStart(3, "0")} 期横版封面 2.35:1" style="display:block;width:100%;height:auto;box-shadow:0 10px 28px rgba(20,45,59,.15);"><figcaption style="margin-top:8px;color:#486071;font-size:13px;">横版 2.35:1 · AI生成示意 · 待审定</figcaption></figure><figure style="margin:0;"><img src="/preview/wechat-cover?slug=${query}&variant=square" alt="第 ${String(issue.issueNumber).padStart(3, "0")} 期方形封面 1:1" style="display:block;width:100%;height:auto;box-shadow:0 10px 28px rgba(20,45,59,.15);"><figcaption style="margin-top:8px;color:#486071;font-size:13px;">方形 1:1 · AI生成示意 · 待审定</figcaption></figure></div></section><section style="margin-top:24px;padding:28px;background:#fff;box-shadow:0 18px 50px rgba(20,45,59,.08);"><article id="wechat-article">${content}</article></section></main><style>@media(max-width:680px){main>section:nth-child(2)>div{grid-template-columns:1fr!important}}</style><script src="/preview.js"></script></body></html>`;
}

function renderXhsPreview(
  issue: Issue,
  content: { title: string; body: string },
  imageCount: number,
  hasCover: boolean,
  packageFileCount: number,
) {
  const query = encodeURIComponent(issue.slug);
  const exportForm = renderPackageExportForm(issue, "xiaohongshu", "小红书", packageFileCount);
  if (!hasCover) {
    const images = Array.from({ length: imageCount }, (_, index) => `<figure style="margin:0;"><a href="/preview/xhs-image?slug=${query}&index=${index}" download="${String(index + 2).padStart(2, "0")}-carousel.jpg"><img src="/preview/xhs-image?slug=${query}&index=${index}" alt="小红书正文卡 ${index + 2}" style="display:block;width:100%;"></a><figcaption style="margin-top:8px;font-size:13px;color:#5d6b82;">正文卡 ${String(index + 2).padStart(2, "0")} · 点击可保存</figcaption></figure>`).join("");
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>小红书稿包｜${escapeHtml(content.title)}</title></head><body style="margin:0;background:#eef3f5;color:#172333;font-family:Microsoft YaHei,sans-serif;"><header style="position:sticky;top:0;z-index:2;padding:12px;background:#102131;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-value="${escapeHtml(content.title)}">复制标题</button><button data-copy-value="${escapeHtml(content.body)}">复制正文</button></header><main style="max-width:1120px;margin:24px auto;padding:0 18px 48px;"><section style="padding:22px;background:#fff;"><p>小红书正文卡稿包 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期 · 本机可访问</p><h1 style="font-size:26px;line-height:1.4;">${escapeHtml(content.title)}</h1><p style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.75;">${escapeHtml(content.body)}</p><p style="padding:12px;background:#fff8e8;color:#7a4a00;line-height:1.75;">封面 01 待作者另行设计；下方只有 ${imageCount} 张正文卡，从 02 开始。旧目录中的 01-cover.jpg 不属于本次稿包，不能直接上传。这里不会写入小红书。</p>${exportForm}</section><section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:22px;">${images}</section></main><script src="/preview.js"></script></body></html>`;
  }
  const images = Array.from({ length: imageCount }, (_, index) =>
    `<figure style="margin:0;"><a href="/preview/xhs-image?slug=${query}&index=${index}" download="${String(index + 1).padStart(2, "0")}-${index === 0 ? "cover" : "carousel"}.jpg"><img src="/preview/xhs-image?slug=${query}&index=${index}" alt="小红书轮播第 ${index + 1} 张" style="display:block;width:100%;box-shadow:0 18px 50px rgba(20,45,59,.14);"></a><figcaption style="margin-top:8px;color:#5d6b82;font-size:13px;">第 ${index + 1} 张 · 点击图片可单独保存</figcaption></figure>`,
  ).join("");
  const field = (label: string, value: string, multiline = false) => `<div style="display:grid;grid-template-columns:88px minmax(0,1fr) auto;gap:8px;align-items:start;margin:10px 0;"><strong style="padding-top:9px;font-size:13px;">${label}</strong><div style="padding:9px;background:#f3f7f8;white-space:${multiline ? "pre-wrap" : "normal"};word-break:break-word;line-height:1.65;">${escapeHtml(value)}</div><button data-copy-value="${escapeHtml(value)}" style="min-height:36px;padding:0 10px;border:1px solid #168c7b;background:#fff;color:#168c7b;cursor:pointer;">复制</button></div>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>小红书预览｜${escapeHtml(content.title)}</title></head><body style="margin:0;background:#eef3f5;color:#172333;font-family:Microsoft YaHei,sans-serif;"><div style="position:sticky;top:0;z-index:2;padding:12px;text-align:center;background:#102131;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-value="${escapeHtml(content.title)}" style="min-height:40px;padding:0 18px;border:0;background:#35d0ba;color:#102131;font-weight:700;cursor:pointer;">复制标题</button><button data-copy-value="${escapeHtml(content.body)}" style="min-height:40px;padding:0 18px;background:#fff;color:#102131;font-weight:700;cursor:pointer;">复制正文</button><button data-export-focus style="min-height:40px;padding:0 18px;border:0;background:#f6c453;color:#102131;font-weight:700;cursor:pointer;">保存全部小红书资料</button></div><main style="max-width:1120px;margin:28px auto;padding:0 18px 48px;"><section style="margin-bottom:28px;padding:24px;background:#fff;border:1px solid #cbd9df;"><p style="margin:0 0 8px;color:#168c7b;font-size:13px;">小红书完整轮播稿包 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</p><h1 style="margin:0 0 14px;font-size:28px;">${escapeHtml(content.title)}</h1>${field("标题", content.title)}${field("正文描述", content.body, true)}<p style="margin:16px 0 0;color:#486071;line-height:1.7;">共 ${imageCount} 张图片，资料包共 ${packageFileCount} 个文件。填写父文件夹后保存，系统会新建本期独立子目录；上传图片时按名称升序全选，并检查缩略图顺序。这里不会写入小红书。</p><p style="margin:12px 0 0;color:#7a4a00;font-size:13px;line-height:1.7;">从资源管理器地址栏复制路径即可，无需 ZIP 解压或浏览器目录授权。目标文件夹必须已存在。</p>${exportForm}</section><section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">${images}</section></main><script src="/preview.js"></script></body></html>`;
}

function renderZhihuPreview(
  issue: Issue,
  content: { title: string; body: string },
  illustrationCount: number,
  hasCover: boolean,
  packageFileCount: number,
) {
  const query = encodeURIComponent(issue.slug);
  const articleHtml = zhihuPreviewMarkdown.render(content.body);
  const exportForm = renderPackageExportForm(issue, "zhihu", "知乎", packageFileCount);
  const illustrations = Array.from({ length: illustrationCount }, (_, index) => `<figure style="margin:0;"><a href="/preview/zhihu-image?slug=${query}&index=${index}" download="${String(index + 1).padStart(2, "0")}-illustration.jpg"><img src="/preview/zhihu-image?slug=${query}&index=${index}" alt="知乎正文插图 ${index + 1}" style="display:block;width:100%;border:1px solid #d8e2ee;box-shadow:0 16px 40px rgba(37,99,235,.10);"></a><figcaption style="margin-top:8px;color:#5d6b82;font-size:13px;">正文相关插图 ${index + 1} · 点击图片可单独保存</figcaption></figure>`).join("");
  const illustrationSection = illustrationCount > 0
    ? `<section style="margin-top:24px;padding:24px;background:#fff;border:1px solid #d8e2ee;"><h2 style="margin:0 0 14px;font-size:22px;">本期正文插图</h2><p style="color:#5d6b82;line-height:1.7;">这些插图只在能帮助理解正文时提供，不属于情报卡；上传位置以插图清单登记为准。</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;">${illustrations}</div></section>`
    : "";
  const coverNote = hasCover ? "封面由作者另行设计并单独审定。" : "本期封面待作者另行设计。";
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>知乎正文迁移预览｜${escapeHtml(content.title)}</title></head><body style="margin:0;background:#edf3f8;color:#0b1220;font-family:Microsoft YaHei,sans-serif;"><header style="position:sticky;top:0;z-index:2;padding:12px;background:#0b1220;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-value="${escapeHtml(content.title)}">复制标题</button><button data-copy-target="#zhihu-article">复制排版正文</button><button data-copy-value="${escapeHtml(content.body)}">复制 Markdown 备用</button><a href="/download/zhihu-md?slug=${query}" style="padding:10px;background:#fff;color:#0b1220;text-decoration:none;">下载 Markdown</a></header><main style="max-width:900px;margin:24px auto;padding:0 18px 48px;"><section style="padding:22px;background:#fff;border:1px solid #d8e2ee;border-left:6px solid #2563eb;"><p>知乎正文迁移稿包 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期 · 本机可访问</p><h1 style="font-size:28px;line-height:1.4;">${escapeHtml(content.title)}</h1><p style="padding:12px;background:#eef6ff;color:#385168;line-height:1.75;">知乎本期只生成可复制的正文，不生成情报卡。${coverNote} ${illustrationCount > 0 ? `另有 ${illustrationCount} 张经内容审定的正文插图，可按清单选择性上传。` : "本期正文不需要额外插图，直接复制标题和正文即可。"} 普通编辑模式可用时点“复制排版正文”；若使用 Markdown 输入模式，则使用备用按钮并查看知乎预览。这里不会写入知乎。</p>${exportForm}</section>${illustrationSection}<section style="margin-top:24px;padding:28px;background:#fff;border:1px solid #d8e2ee;"><h2 style="margin:0 0 16px;font-size:22px;">完整正文</h2><div id="zhihu-article" class="zhihu-article">${articleHtml}</div></section></main><style>.zhihu-article{font:15px/1.85 Microsoft YaHei,sans-serif;color:#334155;overflow-wrap:anywhere}.zhihu-article h2{font-size:23px;line-height:1.45;color:#0b1220;margin:30px 0 12px;border-top:1px solid #d8e2ee;padding-top:22px}.zhihu-article p{margin:0 0 16px}.zhihu-article ul,.zhihu-article ol{padding-left:24px;margin:0 0 18px}.zhihu-article li{margin:6px 0}.zhihu-article blockquote{margin:18px 0;padding:9px 16px;border-left:4px solid #2563eb;background:#eff6ff}.zhihu-article a{color:#0f766e;overflow-wrap:anywhere}</style><script src="/preview.js"></script></body></html>`;
}

// 历史第005期兼容分支保留，标准 `/preview/zhihu` 不再调用它。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function renderZhihuPreviewLegacyCards(
  issue: Issue,
  content: { title: string; body: string },
  imageCount: number,
  hasCover: boolean,
  packageFileCount: number,
) {
  const query = encodeURIComponent(issue.slug);
  const articleHtml = zhihuPreviewMarkdown.render(content.body);
  const exportForm = renderPackageExportForm(issue, "zhihu", "知乎", packageFileCount);
  if (!hasCover) {
    const images = Array.from({ length: imageCount }, (_, index) => `<figure style="margin:0;"><a href="/preview/zhihu-image?slug=${query}&index=${index}" download="${String(index + 2).padStart(2, "0")}-card.jpg"><img src="/preview/zhihu-image?slug=${query}&index=${index}" alt="第 ${index + 1} 条知乎情报配图" style="display:block;width:100%;"></a><figcaption style="margin-top:8px;font-size:13px;color:#5d6b82;">第 ${index + 1} 条情报标题下方 · 点击可保存</figcaption></figure>`).join("");
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>知乎迁移预览｜${escapeHtml(content.title)}</title></head><body style="margin:0;background:#edf3f8;color:#0b1220;font-family:Microsoft YaHei,sans-serif;"><header style="position:sticky;top:0;z-index:2;padding:12px;background:#0b1220;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-value="${escapeHtml(content.title)}">复制标题</button><button data-copy-target="#zhihu-article">复制排版正文</button><button data-copy-value="${escapeHtml(content.body)}">复制 Markdown 备用</button><a href="/download/zhihu-md?slug=${query}" style="padding:10px;background:#fff;color:#0b1220;text-decoration:none;">下载 Markdown</a></header><main style="max-width:1120px;margin:24px auto;padding:0 18px 48px;"><section style="padding:22px;background:#fff;"><p>知乎迁移稿包 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期 · 本机可访问</p><h1 style="font-size:26px;line-height:1.4;">${escapeHtml(content.title)}</h1><p style="padding:12px;background:#fff8e8;color:#7a4a00;line-height:1.75;">封面待作者另行设计。本页只展示 ${imageCount} 张正文摘要图；旧自动封面不属于本次稿包。普通编辑模式可用时点“复制排版正文”粘贴；若使用 Markdown 语法输入，则点备用按钮并查看知乎预览。这里不会写入知乎。</p>${exportForm}</section><section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:22px;">${images}</section><section style="margin-top:24px;padding:24px;background:#fff;"><h2>完整正文</h2><div id="zhihu-article" class="zhihu-article">${articleHtml}</div></section></main><style>.zhihu-article{font:15px/1.85 Microsoft YaHei,sans-serif;color:#334155;overflow-wrap:anywhere}.zhihu-article h2{font-size:23px;line-height:1.45;color:#0b1220;margin:30px 0 12px;border-top:1px solid #d8e2ee;padding-top:22px}.zhihu-article p{margin:0 0 16px}.zhihu-article ul,.zhihu-article ol{padding-left:24px;margin:0 0 18px}.zhihu-article li{margin:6px 0}.zhihu-article blockquote{margin:18px 0;padding:9px 16px;border-left:4px solid #2563eb;background:#eff6ff}.zhihu-article a{color:#0f766e;overflow-wrap:anywhere}</style><script src="/preview.js"></script></body></html>`;
  }
  const images = Array.from({ length: imageCount }, (_, index) => {
    const placement = index === 0 ? "文章封面" : `第 ${index} 条情报标题下方`;
    return `<figure style="margin:0;"><a href="/preview/zhihu-image?slug=${query}&index=${index}" download="${String(index + 1).padStart(2, "0")}-${index === 0 ? "cover" : "card"}.jpg"><img src="/preview/zhihu-image?slug=${query}&index=${index}" alt="知乎配图 ${index + 1}" style="display:block;width:100%;border:1px solid #d8e2ee;box-shadow:0 16px 40px rgba(37,99,235,.10);"></a><figcaption style="margin-top:8px;color:#5d6b82;font-size:13px;">${placement} · 点击图片可单独保存</figcaption></figure>`;
  }).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>知乎迁移预览｜${escapeHtml(content.title)}</title></head><body style="margin:0;background:#edf3f8;color:#0b1220;font-family:Microsoft YaHei,sans-serif;"><div style="position:sticky;top:0;z-index:2;padding:12px;background:#0b1220;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-value="${escapeHtml(content.title)}" style="min-height:40px;padding:0 18px;border:0;background:#2563eb;color:#fff;font-weight:700;cursor:pointer;">复制标题</button><button data-copy-target="#zhihu-article" style="min-height:40px;padding:0 18px;border:0;background:#fff;color:#0b1220;font-weight:700;cursor:pointer;">复制排版正文</button><button data-copy-value="${escapeHtml(content.body)}">复制 Markdown 备用</button><a href="/download/zhihu-md?slug=${query}" style="padding:10px 16px;background:#fff;color:#0b1220;text-decoration:none;">下载 Markdown</a></div><main style="max-width:1120px;margin:28px auto;padding:0 18px 48px;"><section style="margin-bottom:26px;padding:24px;background:#fff;border:1px solid #d8e2ee;border-left:6px solid #2563eb;"><p style="margin:0 0 8px;color:#2563eb;font-size:13px;">知乎完整迁移稿包 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</p><h1 style="margin:0 0 14px;font-size:30px;line-height:1.35;">${escapeHtml(content.title)}</h1><p style="margin:0;color:#5d6b82;line-height:1.75;">本地配图仍是待审定候选。正文在这里按标题、段落和列表排版，实际知乎后台效果需另行预览。迁移顺序：复制标题与排版正文 → 按需上传封面与正文图 → 保存草稿并预览。Markdown 模式请使用备用按钮并查看实际预览。这里不会写入知乎。</p>${exportForm}</section><section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:22px;">${images}</section><section style="margin-top:26px;padding:28px;background:#fff;border:1px solid #d8e2ee;"><h2 style="margin:0 0 16px;font-size:22px;">完整正文</h2><div id="zhihu-article" class="zhihu-article">${articleHtml}</div></section></main><style>.zhihu-article{font:15px/1.85 Microsoft YaHei,sans-serif;color:#334155;overflow-wrap:anywhere}.zhihu-article h2{font-size:23px;line-height:1.45;color:#0b1220;margin:30px 0 12px;border-top:1px solid #d8e2ee;padding-top:22px}.zhihu-article p{margin:0 0 16px}.zhihu-article ul,.zhihu-article ol{padding-left:24px;margin:0 0 18px}.zhihu-article li{margin:6px 0}.zhihu-article blockquote{margin:18px 0;padding:9px 16px;border-left:4px solid #2563eb;background:#eff6ff}.zhihu-article blockquote p{margin:0}.zhihu-article a{color:#0f766e;overflow-wrap:anywhere}</style><script src="/preview.js"></script></body></html>`;
}

function renderZhihuMixedPreview(
  issue: Issue,
  content: { title: string; body: string },
  visuals: Map<number, string>,
  packageFileCount: number,
) {
  const query = encodeURIComponent(issue.slug);
  const exportForm = renderPackageExportForm(issue, "zhihu", "知乎", packageFileCount);
  const tokens = zhihuPreviewMarkdown.parse(content.body, {});
  const parts: string[] = [];
  const visualIndexes = [...visuals.keys()];
  let imageAfterHeading: number | null = null;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "heading_open" && token.tag === "h2") {
      const headingText = tokens[index + 1]?.content ?? "";
      const cardIndex = issue.cards.findIndex(
        (card, cardNumber) => headingText === `${cardNumber + 1}. ${card.title}`,
      );
      imageAfterHeading = visuals.has(cardIndex) ? cardIndex : null;
    }
    parts.push(zhihuPreviewMarkdown.renderer.render([token], zhihuPreviewMarkdown.options, {}));
    if (token.type === "heading_close" && imageAfterHeading !== null) {
      const cardNumber = imageAfterHeading + 1;
      const imageIndex = visualIndexes.indexOf(imageAfterHeading);
      parts.push(`<figure class="story-visual" data-copy-exclude><a href="/preview/zhihu-mixed-image?slug=${query}&index=${imageIndex}" download="${String(cardNumber).padStart(2, "0")}-infographic.jpg" title="下载第 ${cardNumber} 条情报的信息图"><img src="/preview/zhihu-mixed-image?slug=${query}&index=${imageIndex}" alt="第 ${cardNumber} 条情报的信息图"></a><figcaption>情报 ${String(cardNumber).padStart(2, "0")} · 图片单独下载，插入对应标题下方；不包含在复制正文中</figcaption></figure>`);
      imageAfterHeading = null;
    }
  }

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>知乎迁移页｜${escapeHtml(content.title)}</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f6f7f9;color:#202124;font:16px/1.85 "Microsoft YaHei",Arial,sans-serif}header{position:sticky;top:0;z-index:2;background:#102131;padding:10px 16px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap}header button,header a{border:0;border-radius:4px;background:#fff;color:#102131;padding:8px 12px;font:600 13px/1.5 "Microsoft YaHei",sans-serif;text-decoration:none;cursor:pointer}header button:first-child{background:#35d0ba}header :focus-visible,.story-visual a:focus-visible{outline:3px solid #f6c453;outline-offset:2px}main{max-width:720px;min-height:100vh;margin:auto;padding:28px 22px 80px;background:#fff}.delivery-note{margin:0 0 22px;padding:14px 16px;border-left:4px solid #2563eb;background:#eef4f8;color:#385168;font-size:14px;line-height:1.7}.delivery-note strong{display:block;color:#102131}h1{font-size:28px;line-height:1.45;margin:0 0 24px}h2{font-size:22px;line-height:1.5;margin:36px 0 16px}p{margin:0 0 18px}blockquote{margin:20px 0;padding:3px 16px;border-left:3px solid #c5c9ce;color:#6c737c}ul,ol{padding-left:25px;margin:0 0 20px}li{margin:7px 0}article a{color:#175199;overflow-wrap:anywhere}.story-visual{margin:18px 0 26px}.story-visual img{display:block;width:100%;height:auto}.story-visual figcaption{margin-top:6px;color:#6c737c;font-size:12px;line-height:1.5}@media(max-width:720px){main{padding:20px 16px 60px}h1{font-size:23px}h2{font-size:19px}}
  </style></head><body><header><button data-copy-value="${escapeHtml(content.title)}">复制标题</button><button data-copy-target="#zhihu-article">复制排版正文</button><button data-copy-value="${escapeHtml(content.body)}">复制 Markdown 备用</button><a href="/download/zhihu-md?slug=${query}">下载 Markdown</a></header><main><div class="delivery-note"><strong>知乎迁移稿 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</strong>正文一键复制，不含图片；点击两张信息图可分别保存，插入第 1、3 条情报标题下方。封面由作者另行设计。本页不会写入知乎。${exportForm}</div><h1>${escapeHtml(content.title)}</h1><article id="zhihu-article">${parts.join("")}</article></main><script src="/preview.js"></script></body></html>`;
}

function getZhihuMixedVisuals(issue: Issue) {
  const key = getIssuePackageHash(issue);
  let result = zhihuMixedVisualCache.get(key);
  if (!result) {
    result = generateZhihuMixedVisuals(issue);
    zhihuMixedVisualCache.set(key, result);
    result.catch(() => zhihuMixedVisualCache.delete(key));
  }
  return result;
}

function readArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readNumberArgument(name: string) {
  const value = readArgument(name);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535
    ? parsed
    : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function requireSlug(value: unknown) {
  const slug = readString(value);
  if (!slug) throw new HttpError(400, "发布动作必须指定期刊 slug。");
  return slug;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.byteLength === rightBuffer.byteLength &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function sanitizeError(message: string) {
  return message
    .replace(/access_token=[^&\s]+/gi, "access_token=[已隐藏]")
    .replace(/secret=[^&\s]+/gi, "secret=[已隐藏]")
    .slice(0, 2_000);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
