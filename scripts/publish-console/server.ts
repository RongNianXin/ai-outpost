import { randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";

import { getAllIssues } from "../../lib/content/repository";
import type { Issue } from "../../lib/content/schema";
import {
  executePublishAction,
  getConfirmationPhrases,
} from "../../lib/publishing/actions";
import { loadLocalEnvironment } from "../../lib/publishing/config";
import { getPublishingStatus } from "../../lib/publishing/preflight";
import { preparePlatformPackage } from "../../lib/publishing/prepare";
import type { PublishAction } from "../../lib/publishing/store";
import { exportImagesToDirectory } from "../../lib/publishing/export-images";

const host = "127.0.0.1";
const port = readNumberArgument("--port") ?? 3101;
const requestedSlug = readArgument("--slug") ?? "";
const assetDirectory = path.join(process.cwd(), "scripts", "publish-console");
const sessionToken = randomBytes(32).toString("hex");
const allowedActions = new Set<PublishAction>([
  "website_publish",
  "wechat_draft",
  "wechat_publish",
  "xiaohongshu_private",
  "xiaohongshu_publish",
]);

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
      return sendHtml(response, renderWechatPreview(selected, content));
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
      return serveStaticFile(response, prepared.files.wechatCover, "image/jpeg", false, "attachment");
    }
    if (request.method === "GET" && url.pathname === "/download/wechat-cover-square") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      return serveStaticFile(response, prepared.files.wechatSquareCover, "image/jpeg", false, "attachment");
    }
    if (request.method === "GET" && url.pathname === "/preview/wechat-cover") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      const variant = url.searchParams.get("variant") === "square" ? "square" : "wide";
      const cover = variant === "square" ? prepared.files.wechatSquareCover : prepared.files.wechatCover;
      return serveStaticFile(response, cover, "image/jpeg", false);
    }
    if (request.method === "GET" && url.pathname === "/preview/xiaohongshu") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      return sendHtml(response, renderXhsPreview(selected, prepared.xiaohongshu, prepared.files.xiaohongshuImages.length));
    }
    if (request.method === "GET" && url.pathname === "/preview/xhs-image") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await prepareCachedPackage(selected);
      const index = Number(url.searchParams.get("index"));
      const imagePath = prepared.files.xiaohongshuImages[index];
      if (!Number.isInteger(index) || !imagePath) throw new HttpError(404, "没有这张小红书图片。");
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

function renderWechatPreview(issue: Issue, content: string) {
  const query = encodeURIComponent(issue.slug);
  const originalUrl = `https://rongnianxin.github.io/ai-outpost/issues/${issue.slug}/`;
  const summary = issue.summary;
  const field = (label: string, value: string) => `<div style="display:grid;grid-template-columns:72px 1fr auto;gap:8px;align-items:center;margin:8px 0;"><strong style="font-size:13px;">${label}</strong><code style="padding:8px;background:#f3f7f8;word-break:break-all;">${escapeHtml(value)}</code><button data-copy-value="${escapeHtml(value)}" style="min-height:34px;padding:0 10px;border:1px solid #168c7b;background:#fff;color:#168c7b;cursor:pointer;">复制</button></div>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>公众号迁移交付｜${escapeHtml(issue.title)}</title></head><body style="margin:0;background:#eef3f5;color:#172333;font-family:Microsoft YaHei,sans-serif;"><div style="position:sticky;top:0;z-index:2;padding:12px;text-align:center;background:#102131;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-target="#wechat-article" style="min-height:40px;padding:0 18px;border:0;background:#35d0ba;color:#102131;font-weight:700;cursor:pointer;">复制完整正文</button><a href="/download/wechat-html?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载 HTML</a><a href="/download/wechat-md?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载 Markdown</a><a href="/download/wechat-cover?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载横版封面 2.35:1</a><a href="/download/wechat-cover-square?slug=${query}" style="padding:10px 14px;background:#fff;color:#102131;text-decoration:none;">下载方形封面 1:1</a></div><main style="max-width:900px;margin:28px auto;padding:0 18px 48px;"><section style="padding:22px;background:#fff;border:1px solid #cbd9df;box-shadow:0 18px 50px rgba(20,45,59,.08);"><p style="margin:0 0 8px;color:#168c7b;font-size:13px;">公众号迁移交付页 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</p><h1 style="margin:0 0 12px;font-size:30px;line-height:1.35;">${escapeHtml(issue.title)}</h1><p style="margin:0;color:#486071;line-height:1.7;">先复制字段，再复制完整正文；两张封面来自同一张无字主题底图，只按比例裁切并由程序叠加同一组期号与标题。这里不会写入公众号后台。</p>${field("标题", issue.title)}${field("作者", "暮雨笙")}${field("摘要", summary)}${field("原文链接", originalUrl)}<p style="margin:16px 0 0;color:#486071;font-size:13px;line-height:1.7;">迁移顺序：复制字段 → 复制完整正文 → 按平台需要上传横版或方形封面 → 在后台单独填写原文链接 → 保存草稿 → 手机预览。发布和群发仍需另行确认。</p></section><section style="margin-top:24px;padding:22px;background:#fff;box-shadow:0 18px 50px rgba(20,45,59,.08);"><h2 style="margin:0 0 16px;font-size:22px;">本期封面已准备好</h2><div style="display:grid;grid-template-columns:minmax(0,2.35fr) minmax(220px,1fr);gap:20px;align-items:start;"><figure style="margin:0;"><img src="/preview/wechat-cover?slug=${query}&variant=wide" alt="第 ${String(issue.issueNumber).padStart(3, "0")} 期横版封面 2.35:1" style="display:block;width:100%;height:auto;box-shadow:0 10px 28px rgba(20,45,59,.15);"><figcaption style="margin-top:8px;color:#486071;font-size:13px;">横版 2.35:1 · 公众号优先 · AI生成示意</figcaption></figure><figure style="margin:0;"><img src="/preview/wechat-cover?slug=${query}&variant=square" alt="第 ${String(issue.issueNumber).padStart(3, "0")} 期方形封面 1:1" style="display:block;width:100%;height:auto;box-shadow:0 10px 28px rgba(20,45,59,.15);"><figcaption style="margin-top:8px;color:#486071;font-size:13px;">方形 1:1 · 其他媒体备用 · AI生成示意</figcaption></figure></div></section><section style="margin-top:24px;padding:28px;background:#fff;box-shadow:0 18px 50px rgba(20,45,59,.08);"><article id="wechat-article">${content}</article></section></main><style>@media(max-width:680px){main>section:nth-child(2)>div{grid-template-columns:1fr!important}}</style><script src="/preview.js"></script></body></html>`;
}

function renderXhsPreview(
  issue: Issue,
  content: { title: string; body: string },
  imageCount: number,
) {
  const query = encodeURIComponent(issue.slug);
  const images = Array.from({ length: imageCount }, (_, index) =>
    `<figure style="margin:0;"><a href="/preview/xhs-image?slug=${query}&index=${index}" download="${String(index + 1).padStart(2, "0")}-${index === 0 ? "cover" : "carousel"}.jpg"><img src="/preview/xhs-image?slug=${query}&index=${index}" alt="小红书轮播第 ${index + 1} 张" style="display:block;width:100%;box-shadow:0 18px 50px rgba(20,45,59,.14);"></a><figcaption style="margin-top:8px;color:#5d6b82;font-size:13px;">第 ${index + 1} 张 · 点击图片可单独保存</figcaption></figure>`,
  ).join("");
  const field = (label: string, value: string, multiline = false) => `<div style="display:grid;grid-template-columns:88px minmax(0,1fr) auto;gap:8px;align-items:start;margin:10px 0;"><strong style="padding-top:9px;font-size:13px;">${label}</strong><div style="padding:9px;background:#f3f7f8;white-space:${multiline ? "pre-wrap" : "normal"};word-break:break-word;line-height:1.65;">${escapeHtml(value)}</div><button data-copy-value="${escapeHtml(value)}" style="min-height:36px;padding:0 10px;border:1px solid #168c7b;background:#fff;color:#168c7b;cursor:pointer;">复制</button></div>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>小红书预览｜${escapeHtml(content.title)}</title></head><body style="margin:0;background:#eef3f5;color:#172333;font-family:Microsoft YaHei,sans-serif;"><div style="position:sticky;top:0;z-index:2;padding:12px;text-align:center;background:#102131;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;"><button data-copy-value="${escapeHtml(content.title)}" style="min-height:40px;padding:0 18px;border:0;background:#35d0ba;color:#102131;font-weight:700;cursor:pointer;">复制标题</button><button data-copy-value="${escapeHtml(content.body)}" style="min-height:40px;padding:0 18px;background:#fff;color:#102131;font-weight:700;cursor:pointer;">复制正文</button><button data-export-focus style="min-height:40px;padding:0 18px;border:0;background:#f6c453;color:#102131;font-weight:700;cursor:pointer;">保存全部图片到目录</button></div><main style="max-width:1120px;margin:28px auto;padding:0 18px 48px;"><section style="margin-bottom:28px;padding:24px;background:#fff;border:1px solid #cbd9df;"><p style="margin:0 0 8px;color:#168c7b;font-size:13px;">小红书完整轮播稿包 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</p><h1 style="margin:0 0 14px;font-size:28px;">${escapeHtml(content.title)}</h1>${field("标题", content.title)}${field("正文描述", content.body, true)}<p style="margin:16px 0 0;color:#486071;line-height:1.7;">共 ${imageCount} 张。在下面粘贴目标文件夹的完整路径，再点击保存。系统会新建本期独立子目录，按 01、02、03… 编号保存；上传时按名称升序全选，并检查上传后的缩略图顺序。这里不会写入小红书。图片中的来源 URL 只是文字，逐条来源请进入官网资料包。</p><p style="margin:12px 0 0;color:#7a4a00;font-size:13px;line-height:1.7;">从资源管理器地址栏复制路径即可，无需 ZIP 解压或浏览器目录授权。目标文件夹必须已存在。</p><form id="directory-export" data-slug="${escapeHtml(issue.slug)}" data-token="${sessionToken}"><label for="export-directory">保存到文件夹</label><input id="export-directory" required placeholder="粘贴资源管理器地址栏的完整路径" style="display:block;width:90%;padding:12px;margin:10px 0"><button type="submit">保存全部 ${imageCount} 张图片</button><p id="export-status" role="status" style="overflow-wrap:anywhere;white-space:pre-wrap"></p><button type="button" id="copy-export-path" hidden>复制已保存目录</button></form></section><section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">${images}</section></main><script src="/preview.js"></script></body></html>`;
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
