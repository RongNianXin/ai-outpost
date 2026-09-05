import { access } from "node:fs/promises";
import path from "node:path";

import type { Issue } from "../content/schema";
import { runCommand } from "./commands";
import { getWechatConfig } from "./config";
import { readPublishState } from "./store";
import { getIssuePackageHash } from "./prepare";
import { getBlockingChanges, parseGitStatus } from "./git-state";
import { readPublishingGate } from "./run-gate";

export type Check = {
  label: string;
  ok: boolean;
  detail: string;
};

export type PlatformPreflight = {
  platform: "website" | "wechat" | "xiaohongshu";
  ready: boolean;
  checks: Check[];
};

export async function getPublishingStatus(issue: Issue) {
  const [gitStatus, branch, remote, ghAuth, xhsStatus, heroExists, state] =
    await Promise.all([
      runCommand("git", ["status", "--porcelain"], { timeoutMs: 10_000 }),
      runCommand("git", ["branch", "--show-current"], { timeoutMs: 10_000 }),
      runCommand("git", ["remote", "get-url", "origin"], { timeoutMs: 10_000 }),
      runCommand("gh", ["auth", "status", "--hostname", "github.com"], {
        timeoutMs: 15_000,
      }),
      runCommand("xhs", ["status", "--yaml"], { timeoutMs: 20_000 }),
      hasHero(issue),
      readPublishState(),
    ]);
  const wechat = getWechatConfig();
  const issueHash = getIssuePackageHash(issue);
  const issueReady = ["approved", "published", "corrected"].includes(
    issue.status,
  );
  const originExpected = /RongNianXin[\\/]ai-outpost(?:\.git)?$/i.test(
    remote.stdout,
  );
  const changes = gitStatus.ok ? parseGitStatus(gitStatus.stdout) : [];
  const blockingChanges = getBlockingChanges(changes, issue);

  const platforms: PlatformPreflight[] = [
    makePlatform("website", [
      check("内容已通过预览门禁", issueReady, `当前状态：${issue.status}`),
      check(
        "没有代码或配置改动",
        gitStatus.ok && blockingChanges.length === 0,
        !gitStatus.ok
          ? "无法读取 Git 状态"
          : blockingChanges.length > 0
            ? `有 ${blockingChanges.length} 项非期刊改动；请先保存本地版本`
            : changes.length > 0
              ? "只有本期内容或运行记录改动，可由发布动作定点提交"
              : "没有未保存改动",
      ),
      check("当前分支是 main", branch.ok && branch.stdout === "main", branch.stdout || "无法读取"),
      check("远端仓库匹配", remote.ok && originExpected, remote.stdout || "无法读取"),
      check("GitHub 已登录", ghAuth.ok, ghAuth.ok ? "gh 登录有效" : "需要运行 gh auth login"),
    ]),
    makePlatform("wechat", [
      check("内容已通过预览门禁", issueReady, `当前状态：${issue.status}`),
      check("封面图可用", heroExists, heroExists ? "将生成公众号封面" : "本期缺少主视觉"),
      check(
        "公众号开发者凭据已配置",
        wechat.configured,
        wechat.configured
          ? "AppID 与 AppSecret 已在本机配置"
          : "需要先申请账号，并填写 .env.local",
      ),
    ]),
    makePlatform("xiaohongshu", [
      check("内容已通过预览门禁", issueReady, `当前状态：${issue.status}`),
      check("封面图可用", heroExists, heroExists ? "可生成 3:4 竖版封面" : "本期缺少主视觉"),
      check(
        "小红书登录有效",
        xhsStatus.ok,
        xhsStatus.ok ? "本机登录有效" : "需要运行 xhs login --qrcode 并扫码",
      ),
    ]),
  ];

  const gate = await readPublishingGate(issue.id);
  for (const platform of platforms) {
    platform.checks.unshift(check("运行模式允许外部写入", gate.ok, gate.detail));
    platform.ready = platform.checks.every((item) => item.ok);
  }
  return {
    issue: {
      id: issue.id,
      slug: issue.slug,
      issueNumber: issue.issueNumber,
      title: issue.title,
      status: issue.status,
      period: issue.period,
    },
    platforms,
    receipts: state.receipts
      .filter(
        (receipt) =>
          receipt.issueId === issue.id && receipt.issueHash === issueHash,
      )
      .slice(-12)
      .reverse(),
  };
}

function makePlatform(
  platform: PlatformPreflight["platform"],
  checks: Check[],
): PlatformPreflight {
  return { platform, ready: checks.every((item) => item.ok), checks };
}

function check(label: string, ok: boolean, detail: string): Check {
  return { label, ok, detail };
}

async function hasHero(issue: Issue) {
  const src = issue.hero?.visual?.src;
  if (!src) return false;
  const filePath = path.resolve(process.cwd(), "public", src.slice(1));
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
