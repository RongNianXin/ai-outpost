import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadIssueFiles } from "../../lib/content/load-files";
import { approvedIssueStatuses } from "../../lib/content/schema";
import { renderZhihuMarkdown } from "../../lib/content/zhihu";
import { generateZhihuAssets } from "../../lib/publishing/assets";

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
    const assets = await generateZhihuAssets(issue);
    const [titleLine, , ...bodyLines] = markdown.split("\n");
    const title = titleLine.replace(/^#\s+/, "");
    const outputs = [
      [path.join(outputDirectory, `${issue.slug}-title.txt`), `${title}\n`],
      [path.join(outputDirectory, `${issue.slug}-body.md`), `${bodyLines.join("\n")}\n`],
      [path.join(outputDirectory, `${issue.slug}.md`), markdown],
    ] as const;
    await Promise.all(outputs.map(([outputPath, content]) => writeFile(outputPath, content, "utf8")));
    const uploadOrder = await Promise.all(
      assets.images.map(async (imagePath, index) => ({
        order: index + 1,
        name: path.basename(imagePath),
        path: imagePath,
        placement: index === 0 ? "文章封面" : `第 ${index} 条情报标题下方`,
        width: 1200,
        height: 675,
        bytes: (await stat(imagePath)).size,
      })),
    );
    const manifestPath = path.join(outputDirectory, issue.slug, "manifest.json");
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        issueId: issue.id,
        slug: issue.slug,
        issueNumber: issue.issueNumber,
        title,
        titlePath: outputs[0][0],
        bodyPath: outputs[1][0],
        markdownPath: outputs[2][0],
        uploadOrder,
      }, null, 2)}\n`,
      "utf8",
    );
    outputs.forEach(([outputPath]) => console.log(`Exported ${path.relative(process.cwd(), outputPath)}`));
    console.log(`Exported ${path.relative(process.cwd(), manifestPath)}`);
  }));
}

function readSlugArgument(args: string[]) {
  const index = args.indexOf("--slug");
  return index >= 0 ? args[index + 1] : undefined;
}

void main();
