import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadIssueFiles } from "../../content/load-files";
import { issueSchema, type Issue } from "../../content/schema";
import { commandSummary, runCommand } from "../commands";
import { assertPublishingAllowed } from "../run-gate";
import {
  getBlockingChanges,
  getPublicationPaths,
  parseGitStatus,
} from "../git-state";

const EXPECTED_REMOTE = /RongNianXin[\\/]ai-outpost(?:\.git)?$/i;

export async function publishWebsite(issue: Issue) {
  await assertPublishingAllowed(issue.id);
  const initialChanges = await assertSafeMainBranch(issue);
  await assertRemoteCanFastForward();

  const issueFile = (await loadIssueFiles()).find(
    ({ issue: candidate }) => candidate.id === issue.id,
  );
  if (!issueFile) throw new Error(`找不到 ${issue.id} 的内容文件。`);
  const relativePath = path.join("content", "issues", issueFile.fileName);
  const absolutePath = path.join(process.cwd(), relativePath);
  const original = await readFile(absolutePath, "utf8");
  const originalNextEnv = await readOptionalFile(
    path.join(process.cwd(), "next-env.d.ts"),
  );
  let changedContent = false;
  let commitCreated = false;
  let stagedPaths: string[] = [];

  try {
    await assertPublishingAllowed(issue.id);
    if (issue.status === "approved") {
      const now = new Date().toISOString();
      const nextIssue = issueSchema.parse({
        ...issue,
        status: "published",
        publishedAt: now,
        editorial: {
          ...issue.editorial,
          publicationApprovedAt: now,
        },
      });
      await writeFile(absolutePath, `${JSON.stringify(nextIssue, null, 2)}\n`, "utf8");
      changedContent = true;
    } else if (!new Set(["published", "corrected"]).has(issue.status)) {
      throw new Error(`当前内容状态 ${issue.status} 不允许官网发布。`);
    }

    await runRequired("pnpm.cmd", ["content:validate"], 60_000, true);
    await runRequired("pnpm.cmd", ["content:check:links"], 180_000, true);
    await runRequired("pnpm.cmd", ["typecheck"], 90_000, true);
    await runRequired("pnpm.cmd", ["lint"], 90_000, true);
    await runRequired("pnpm.cmd", ["test"], 120_000, true);
    await runRequired("pnpm.cmd", ["build"], 180_000, true);
    if (originalNextEnv !== null) {
      await writeFile(path.join(process.cwd(), "next-env.d.ts"), originalNextEnv, "utf8");
    }

    const currentStatus = await runRequired(
      "git",
      ["status", "--porcelain"],
      10_000,
    );
    const currentChanges = parseGitStatus(currentStatus.stdout);
    const blocking = getBlockingChanges(currentChanges, issue);
    if (blocking.length > 0) {
      throw new Error("构建产生了本期内容之外的改动，官网发布已停止。");
    }
    await assertPublishingAllowed(issue.id);
    stagedPaths = getPublicationPaths(issue, currentChanges);
    await runRequired("git", ["add", "--", ...stagedPaths], 20_000);
    const issueNumber = String(issue.issueNumber).padStart(3, "0");
    const staged = await runCommand("git", ["diff", "--cached", "--quiet"], {
      timeoutMs: 10_000,
    });
    if (staged.code === 1) {
      await assertPublishingAllowed(issue.id);
      await runRequired(
        "git",
        ["commit", "-m", `content: publish issue ${issueNumber}`],
        30_000,
      );
      commitCreated = true;
    } else if (!staged.ok) {
      throw new Error(`无法检查待提交内容：${commandSummary(staged)}`);
    }

    await assertPublishingAllowed(issue.id);
    await runRequired("git", ["push", "origin", "main"], 120_000);

    await assertPublishingAllowed(issue.id);
    await runRequired(
      "gh",
      ["workflow", "run", "deploy-pages.yml", "--ref", "main"],
      30_000,
    );
    const commit = await runRequired("git", ["rev-parse", "HEAD"], 10_000);
    return {
      externalId: commit.stdout,
      detail: changedContent
        ? "内容已提交并推送，GitHub Pages 部署已触发"
        : "GitHub Pages 部署已重新触发",
    };
  } catch (error) {
    if (!commitCreated) {
      const pathsToUnstage = stagedPaths.length
        ? stagedPaths
        : getPublicationPaths(issue, initialChanges);
      await runCommand("git", ["restore", "--staged", "--", ...pathsToUnstage], {
        timeoutMs: 10_000,
      });
      if (changedContent) {
        await writeFile(absolutePath, original, "utf8");
      }
    }
    if (originalNextEnv !== null) {
      await writeFile(path.join(process.cwd(), "next-env.d.ts"), originalNextEnv, "utf8");
    }
    throw error;
  }
}

async function assertSafeMainBranch(issue: Issue) {
  const [status, branch, remote, auth] = await Promise.all([
    runRequired("git", ["status", "--porcelain"], 10_000),
    runRequired("git", ["branch", "--show-current"], 10_000),
    runRequired("git", ["remote", "get-url", "origin"], 10_000),
    runRequired("gh", ["auth", "status", "--hostname", "github.com"], 20_000),
  ]);
  const changes = parseGitStatus(status.stdout);
  const blocking = getBlockingChanges(changes, issue);
  if (blocking.length > 0) {
    throw new Error(`工作区有 ${blocking.length} 项代码或配置改动，请先保存本地版本。`);
  }
  if (branch.stdout !== "main") throw new Error("当前不是 main 分支，官网发布已停止。");
  if (!EXPECTED_REMOTE.test(remote.stdout)) {
    throw new Error("origin 不是预期的 RongNianXin/ai-outpost 仓库。");
  }
  if (!auth.ok) throw new Error("GitHub 登录无效，请重新运行 gh auth login。");
  return changes;
}

async function assertRemoteCanFastForward() {
  await runRequired("git", ["fetch", "origin", "main"], 60_000);
  const ancestor = await runCommand(
    "git",
    ["merge-base", "--is-ancestor", "origin/main", "HEAD"],
    { timeoutMs: 10_000 },
  );
  if (!ancestor.ok) {
    throw new Error("origin/main 不是本机 HEAD 的祖先，请先处理远端分叉再发布。");
  }
}

async function readOptionalFile(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function runRequired(
  command: string,
  args: string[],
  timeoutMs: number,
  useShell = false,
) {
  const result = await runCommand(command, args, {
    timeoutMs,
    shell: useShell && process.platform === "win32",
  });
  if (!result.ok) {
    throw new Error(`${command} ${args.join(" ")} 失败：${commandSummary(result)}`);
  }
  return result;
}
