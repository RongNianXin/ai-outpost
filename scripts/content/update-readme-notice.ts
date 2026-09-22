import { promises as fs } from "node:fs";
import path from "node:path";

import { getLatestPublicIssue } from "../../lib/content/repository";
import {
  getLatestReadmeNoticeMismatch,
  renderLatestReadmeNotice,
  replaceLatestReadmeNotice,
} from "../../lib/content/readme-notice";

async function main() {
  const issue = await getLatestPublicIssue();
  if (!issue) {
    throw new Error("没有可用于更新 README 提示的公开期刊。");
  }

  const readmePath = path.join(process.cwd(), "README.md");
  const readme = await fs.readFile(readmePath, "utf8");
  const mismatch = getLatestReadmeNoticeMismatch(readme, issue);
  if (process.argv.includes("--check")) {
    if (mismatch) {
      throw new Error(`README 最新一期与公开第 ${String(issue.issueNumber).padStart(3, "0")} 期不一致。请运行 pnpm.cmd content:update-readme。`);
    }
    console.log(`README latest notice matches issue ${String(issue.issueNumber).padStart(3, "0")}: ${issue.slug}`);
    return;
  }
  const updated = mismatch ?? replaceLatestReadmeNotice(readme, renderLatestReadmeNotice(issue));
  await fs.writeFile(readmePath, updated, "utf8");

  console.log(`Updated README latest notice to issue ${String(issue.issueNumber).padStart(3, "0")}: ${issue.slug}`);
}

void main();
