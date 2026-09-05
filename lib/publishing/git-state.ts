import type { Issue } from "../content/schema";

const planningPaths = new Set(["task_plan.md", "findings.md", "progress.md"]);

export type GitChange = {
  code: string;
  path: string;
  staged: boolean;
};

export function parseGitStatus(output: string): GitChange[] {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const renameTarget = rawPath.includes(" -> ")
        ? rawPath.split(" -> ").at(-1) ?? rawPath
        : rawPath;
      return {
        code,
        path: renameTarget.replaceAll("\\", "/").replace(/^"|"$/g, ""),
        staged: code[0] !== " " && code[0] !== "?",
      };
    });
}

export function getBlockingChanges(changes: GitChange[], issue: Issue) {
  return changes.filter(
    (change) => change.staged || !isAllowedPreparationChange(change.path, issue),
  );
}

export function isAllowedPreparationChange(filePath: string, issue: Issue) {
  const normalized = filePath.replaceAll("\\", "/");
  if (planningPaths.has(normalized)) return true;
  if (normalized === `content/issues/${issue.id}.json`) return true;
  if (normalized === "content/sources.json") return true;
  if (normalized === "ops/weekly-run-state.json") return true;
  if (/^ops\/runs\/[0-9]{4}-W[0-9]{2}\.json$/.test(normalized)) return true;
  const hero = issue.hero?.visual?.src.replace(/^\//, "public/");
  if (hero && normalized === hero) return true;
  const issueLabel = String(issue.issueNumber).padStart(3, "0");
  if (normalized.startsWith(`docs/reviews/ISSUE-${issueLabel}-`) && normalized.endsWith(".md")) {
    return true;
  }
  return false;
}

export function getPublicationPaths(issue: Issue, changes: GitChange[]) {
  const paths = new Set<string>();
  for (const change of changes) {
    const filePath = change.path;
    if (planningPaths.has(filePath)) continue;
    if (isAllowedPreparationChange(filePath, issue)) paths.add(filePath);
  }
  paths.add(`content/issues/${issue.id}.json`);
  return [...paths];
}
