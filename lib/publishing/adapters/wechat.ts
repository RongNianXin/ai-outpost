import { readFile } from "node:fs/promises";

import type { Issue } from "../../content/schema";
import { getWechatConfig } from "../config";
import { getPublicIssueUrl } from "../derivatives";
import { assertPublishingAllowed } from "../run-gate";

const API_ORIGIN = "https://api.weixin.qq.com";

type WechatErrorShape = {
  errcode?: number;
  errmsg?: string;
};

export async function createWechatDraft(
  issue: Issue,
  htmlPath: string,
  coverPath: string,
) {
  await assertPublishingAllowed(issue.id);
  const config = getWechatConfig();
  if (!config.configured) {
    throw new Error("公众号 AppID / AppSecret 尚未在 .env.local 配置。");
  }
  const [accessToken, html] = await Promise.all([
    getAccessToken(config.appId, config.appSecret),
    readFile(htmlPath, "utf8"),
  ]);
  const thumbMediaId = await uploadThumb(accessToken, coverPath, issue.id);
  const response = await postJson<{ media_id?: string } & WechatErrorShape>(
    `/cgi-bin/draft/add?access_token=${encodeURIComponent(accessToken)}`,
    {
      articles: [
        {
          title: truncate(issue.title, 64),
          author: config.author,
          digest: truncate(issue.summary, 120),
          content: html,
          content_source_url: getPublicIssueUrl(issue),
          thumb_media_id: thumbMediaId,
          need_open_comment: 0,
          only_fans_can_comment: 0,
        },
      ],
    },
    issue.id,
  );
  assertWechatSuccess(response, "创建公众号草稿");
  if (!response.media_id) {
    throw new Error("公众号接口未返回草稿 media_id。");
  }
  return response.media_id;
}

export async function publishWechatDraft(draftMediaId: string, issueId: string) {
  await assertPublishingAllowed(issueId);
  const config = getWechatConfig();
  if (!config.configured) {
    throw new Error("公众号 AppID / AppSecret 尚未在 .env.local 配置。");
  }
  const accessToken = await getAccessToken(config.appId, config.appSecret);
  const response = await postJson<
    { publish_id?: string } & WechatErrorShape
  >(
    `/cgi-bin/freepublish/submit?access_token=${encodeURIComponent(accessToken)}`,
    { media_id: draftMediaId },
    issueId,
  );
  assertWechatSuccess(response, "提交公众号发布");
  if (!response.publish_id) {
    throw new Error("公众号接口未返回 publish_id。");
  }
  return response.publish_id;
}

async function getAccessToken(appId: string, appSecret: string) {
  const url = new URL("/cgi-bin/token", API_ORIGIN);
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    access_token?: string;
  } & WechatErrorShape;
  if (!response.ok) {
    throw new Error(`公众号鉴权失败：HTTP ${response.status}`);
  }
  assertWechatSuccess(payload, "公众号鉴权");
  if (!payload.access_token) {
    throw new Error("公众号鉴权未返回 access_token。");
  }
  return payload.access_token;
}

async function uploadThumb(accessToken: string, coverPath: string, issueId: string) {
  const image = await readFile(coverPath);
  const form = new FormData();
  form.append("media", new Blob([image], { type: "image/jpeg" }), "cover.jpg");
  await assertPublishingAllowed(issueId);
  const response = await fetch(
    `${API_ORIGIN}/cgi-bin/material/add_material?access_token=${encodeURIComponent(accessToken)}&type=image`,
    {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30_000),
    },
  );
  const payload = (await response.json()) as {
    media_id?: string;
  } & WechatErrorShape;
  if (!response.ok) {
    throw new Error(`上传公众号封面失败：HTTP ${response.status}`);
  }
  assertWechatSuccess(payload, "上传公众号封面");
  if (!payload.media_id) {
    throw new Error("公众号素材接口未返回 media_id。");
  }
  return payload.media_id;
}

async function postJson<T>(pathname: string, body: unknown, issueId: string): Promise<T> {
  await assertPublishingAllowed(issueId);
  const response = await fetch(`${API_ORIGIN}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`公众号接口失败：HTTP ${response.status}`);
  }
  return payload;
}

function assertWechatSuccess(payload: WechatErrorShape, action: string) {
  if (typeof payload.errcode === "number" && payload.errcode !== 0) {
    throw new Error(
      `${action}失败：${payload.errcode} ${payload.errmsg ?? "未提供说明"}`,
    );
  }
}

function truncate(value: string, maxLength: number) {
  const units = Array.from(value.trim());
  return units.length <= maxLength
    ? units.join("")
    : `${units.slice(0, maxLength - 1).join("")}…`;
}
