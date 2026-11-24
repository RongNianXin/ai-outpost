import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

import { loadIssueFiles } from "../../lib/content/load-files";
import { preparePlatformPackage } from "../../lib/publishing/prepare";

const execFileAsync = promisify(execFile);

async function main() {
  const requestedSlug = readArgument("--slug");
  const files = await loadIssueFiles();
  const selected = requestedSlug
    ? files.find(({ issue: candidate }) => candidate.slug === requestedSlug)
    : files
        .filter(({ issue: candidate }) =>
          ["approved", "published", "corrected"].includes(candidate.status),
        )
        .sort((a, b) => b.issue.issueNumber - a.issue.issueNumber)[0];

  if (!selected) {
    throw new Error(
      requestedSlug
        ? `No issue found for slug "${requestedSlug}".`
        : "No approved issue found.",
    );
  }
  const { issue, fileName } = selected;
  const archiveScript = path.join(process.cwd(), "scripts", "ops", "archive-issue-materials.mjs");
  await execFileAsync(process.execPath, [archiveScript, "--file", fileName, "--check"], { cwd: process.cwd(), windowsHide: true });
  const prepared = await preparePlatformPackage(issue);
  const archiveResult = await execFileAsync(process.execPath, [
    archiveScript,
    "--file",
    fileName,
  ], { cwd: process.cwd(), windowsHide: true });
  const archiveSummary = JSON.parse(archiveResult.stdout);
  if (!Array.isArray(archiveSummary) || archiveSummary.length !== 1 || archiveSummary[0]?.issueNumber !== String(issue.issueNumber).padStart(3, "0")) {
    throw new Error(`Issue archive did not return a valid record for issue ${issue.issueNumber}.`);
  }
  console.log(`Prepared issue ${String(issue.issueNumber).padStart(3, "0")}`);
  console.log(`Manifest: ${prepared.manifestPath}`);
  console.log(`底稿归档: ${archiveSummary[0].destination} (${archiveSummary[0].entryCount} files)`);
  console.log(`Website preview: ${prepared.previewUrl}`);
  console.log(`WeChat HTML: ${prepared.files.wechatHtml}`);
  console.log("公众号、小红书、知乎封面：按项目规则等待1:1候选审定；尚未派生平台比例。");
  console.log(`Xiaohongshu body images (${prepared.files.xiaohongshuImages.length}): ${prepared.files.xiaohongshuImages.join(", ")}`);
}

function readArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

void main();
