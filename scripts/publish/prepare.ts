import { loadIssueFiles } from "../../lib/content/load-files";
import { preparePlatformPackage } from "../../lib/publishing/prepare";

async function main() {
  const requestedSlug = readArgument("--slug");
  const files = await loadIssueFiles();
  const issue = requestedSlug
    ? files.find(({ issue: candidate }) => candidate.slug === requestedSlug)?.issue
    : files
        .map(({ issue: candidate }) => candidate)
        .filter((candidate) =>
          ["approved", "published", "corrected"].includes(candidate.status),
        )
        .sort((a, b) => b.issueNumber - a.issueNumber)[0];

  if (!issue) {
    throw new Error(
      requestedSlug
        ? `No issue found for slug "${requestedSlug}".`
        : "No approved issue found.",
    );
  }
  const prepared = await preparePlatformPackage(issue);
  console.log(`Prepared issue ${String(issue.issueNumber).padStart(3, "0")}`);
  console.log(`Manifest: ${prepared.manifestPath}`);
  console.log(`Website preview: ${prepared.previewUrl}`);
  console.log(`WeChat HTML: ${prepared.files.wechatHtml}`);
  console.log(`Xiaohongshu cover: ${prepared.files.xiaohongshuCover}`);
}

function readArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

void main();
