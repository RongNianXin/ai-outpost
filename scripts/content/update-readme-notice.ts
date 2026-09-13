import { promises as fs } from "node:fs";
import path from "node:path";

import { getLatestPublicIssue } from "../../lib/content/repository";
import {
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
  const updated = replaceLatestReadmeNotice(readme, renderLatestReadmeNotice(issue));
  await fs.writeFile(readmePath, updated, "utf8");

  console.log(`Updated README latest notice to issue ${String(issue.issueNumber).padStart(3, "0")}: ${issue.slug}`);
}

void main();
