import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadIssueFiles } from "../../lib/content/load-files";
import { approvedIssueStatuses } from "../../lib/content/schema";
import { renderZhihuMarkdown } from "../../lib/content/zhihu";

async function main() {
  const requestedSlug = readSlugArgument(process.argv.slice(2));
  const issues = (await loadIssueFiles())
    .map(({ issue }) => issue)
    .filter((issue) => approvedIssueStatuses.includes(issue.status as (typeof approvedIssueStatuses)[number]))
    .filter((issue) => !requestedSlug || issue.slug === requestedSlug);
  if (issues.length === 0) throw new Error(`No publishable issues found${requestedSlug ? ` for slug "${requestedSlug}"` : ""}.`);
  const outputDirectory = path.join(process.cwd(), "exports", "zhihu");
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(issues.map(async (issue) => {
    const markdown = renderZhihuMarkdown(issue);
    const [titleLine, , ...bodyLines] = markdown.split("\n");
    const title = titleLine.replace(/^#\s+/, "");
    const outputs = [
      [path.join(outputDirectory, `${issue.slug}-title.txt`), `${title}\n`],
      [path.join(outputDirectory, `${issue.slug}-body.md`), `${bodyLines.join("\n")}\n`],
      [path.join(outputDirectory, `${issue.slug}.md`), markdown],
    ] as const;
    await Promise.all(outputs.map(([outputPath, content]) => writeFile(outputPath, content, "utf8")));
    outputs.forEach(([outputPath]) => console.log(`Exported ${path.relative(process.cwd(), outputPath)}`));
  }));
}

function readSlugArgument(args: string[]) {
  const index = args.indexOf("--slug");
  return index >= 0 ? args[index + 1] : undefined;
}

void main();
