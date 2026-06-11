import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadIssueFiles } from "../../lib/content/load-files";
import { approvedIssueStatuses } from "../../lib/content/schema";
import { renderWechatMarkdown } from "../../lib/content/wechat";

async function main() {
  const requestedSlug = readSlugArgument(process.argv.slice(2));
  const files = await loadIssueFiles();
  const publishable = files
    .map(({ issue }) => issue)
    .filter((issue) =>
      approvedIssueStatuses.includes(
        issue.status as (typeof approvedIssueStatuses)[number],
      ),
    )
    .filter((issue) => !requestedSlug || issue.slug === requestedSlug);

  if (publishable.length === 0) {
    const detail = requestedSlug ? ` for slug "${requestedSlug}"` : "";
    throw new Error(`No publishable issues found${detail}.`);
  }

  const outputDirectory = path.join(process.cwd(), "exports", "wechat");
  await mkdir(outputDirectory, { recursive: true });

  await Promise.all(
    publishable.map(async (issue) => {
      const outputPath = path.join(outputDirectory, `${issue.slug}.md`);
      await writeFile(outputPath, renderWechatMarkdown(issue), "utf8");
      console.log(`Exported ${path.relative(process.cwd(), outputPath)}`);
    }),
  );
}

function readSlugArgument(args: string[]) {
  const slugIndex = args.indexOf("--slug");
  return slugIndex >= 0 ? args[slugIndex + 1] : undefined;
}

void main();
