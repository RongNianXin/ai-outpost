import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { getAllIssues, isIssueVisible } from "../../lib/content/repository";
import { getInspirationPath, renderInspirationMarkdown } from "../../lib/content/inspiration";

async function main() {
  const issues = (await getAllIssues()).filter((issue) => isIssueVisible(issue.status, "production"));
  const expected = new Set(issues.map((issue) => `${issue.slug}/brief.md`));
  const originIndex = process.argv.indexOf("--origin");
  const origin = originIndex >= 0 ? process.argv[originIndex + 1] : undefined;
  if (originIndex >= 0 && !origin) throw new Error("--origin requires a site URL");
  if (origin) {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Expected HTTP(S) origin");
  }
  for (const issue of issues) {
    const markdown = renderInspirationMarkdown(issue);
    const file = path.join("out", "issues", issue.slug, "brief.md");
    if (await readFile(file, "utf8") !== markdown) throw new Error(`Missing/stale download: ${file}`);
    const html = await readFile(path.join("out", "issues", issue.slug, "index.html"), "utf8");
    if (!html.includes(getInspirationPath(issue.slug, process.env.NEXT_PUBLIC_BASE_PATH)))
      throw new Error(`Missing download link: ${issue.slug}`);
    if (origin) {
      const url = new URL(`issues/${issue.slug}/brief.md`, origin.replace(/\/$/, "") + "/");
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok || await response.text() !== markdown)
        throw new Error(`Public download failed or stale: ${url} (HTTP ${response.status})`);
    }
  }
  const exported = await readdir(path.join("out", "issues"), { recursive: true }).catch(
    (error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return []; throw error; },
  );
  for (const file of exported) {
    const normalized = file.replaceAll("\\", "/");
    if (normalized.endsWith("/brief.md") && !expected.has(normalized))
      throw new Error(`Unexpected unpublished/orphan download: ${normalized}`);
  }
  console.log(`Verified ${issues.length} published Markdown export(s), page links and no unpublished downloads${origin ? "; HTTP contents also verified" : ""}.`);
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
