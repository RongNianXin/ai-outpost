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

const server = createServer(async (request, response) => {
  try {
    setSecurityHeaders(response);
    const url = new URL(request.url ?? "/", `http://${host}:${port}`);
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
      const prepared = await preparePlatformPackage(selected);
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
      const prepared = await preparePlatformPackage(selected);
      const content = await readFile(prepared.files.wechatHtml, "utf8");
      return sendHtml(response, renderWechatPreview(selected, content));
    }
    if (request.method === "GET" && url.pathname === "/preview/xiaohongshu") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await preparePlatformPackage(selected);
      return sendHtml(response, renderXhsPreview(selected, prepared.xiaohongshu));
    }
    if (request.method === "GET" && url.pathname === "/preview/xhs-cover") {
      const { selected } = await selectIssue(url.searchParams.get("slug"));
      const prepared = await preparePlatformPackage(selected);
      return serveStaticFile(response, prepared.files.xiaohongshuCover, "image/jpeg", false);
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
) {
  const info = await stat(filePath);
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": info.size,
    "Cache-Control": cache ? "no-cache" : "no-store",
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
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>公众号预览｜${escapeHtml(issue.title)}</title></head><body style="margin:0;background:#eef3f5;color:#172333;font-family:Microsoft YaHei,sans-serif;"><div style="position:sticky;top:0;z-index:2;padding:12px;text-align:center;background:#102131;"><button data-copy-target="#wechat-article" style="min-height:40px;padding:0 18px;border:0;background:#35d0ba;color:#102131;font-weight:700;cursor:pointer;">复制公众号富文本</button></div><main style="max-width:677px;margin:28px auto;padding:36px 28px;background:white;box-shadow:0 18px 50px rgba(20,45,59,.12);"><p style="margin:0 0 12px;color:#168c7b;font-size:13px;">公众号草稿预览 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</p><h1 style="font-size:30px;line-height:1.35;margin:0 0 24px;">${escapeHtml(issue.title)}</h1><article id="wechat-article">${content}</article></main><script src="/preview.js"></script></body></html>`;
}

function renderXhsPreview(
  issue: Issue,
  content: { title: string; body: string },
) {
  const query = encodeURIComponent(issue.slug);
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>小红书预览｜${escapeHtml(content.title)}</title></head><body style="margin:0;background:#eef3f5;color:#172333;font-family:Microsoft YaHei,sans-serif;"><div style="position:sticky;top:0;z-index:2;padding:12px;text-align:center;background:#102131;"><button data-copy-target="#xhs-copy" style="min-height:40px;padding:0 18px;border:0;background:#35d0ba;color:#102131;font-weight:700;cursor:pointer;">复制小红书标题和正文</button></div><main style="display:grid;grid-template-columns:minmax(280px,430px) minmax(280px,520px);gap:28px;max-width:1000px;margin:28px auto;padding:0 18px;"><img src="/preview/xhs-cover?slug=${query}" alt="小红书竖版封面" style="display:block;width:100%;box-shadow:0 18px 50px rgba(20,45,59,.14);"><article id="xhs-copy" style="padding:30px;background:white;"><p style="margin:0 0 10px;color:#168c7b;font-size:13px;">小红书图文预览</p><h1 style="font-size:27px;line-height:1.35;margin:0 0 22px;">${escapeHtml(content.title)}</h1><pre style="white-space:pre-wrap;font:15px/1.8 Microsoft YaHei,sans-serif;color:#394d5b;">${escapeHtml(content.body)}</pre></article></main><style>@media(max-width:760px){main{grid-template-columns:1fr!important}}</style><script src="/preview.js"></script></body></html>`;
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
