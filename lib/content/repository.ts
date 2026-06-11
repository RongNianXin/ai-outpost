import { promises as fs } from "node:fs";
import path from "node:path";

import {
  approvedIssueStatuses,
  issueSchema,
  publicIssueStatuses,
  type Issue,
} from "./schema";

const issuesDirectory = path.join(process.cwd(), "content", "issues");

export async function getAllIssues(): Promise<Issue[]> {
  const fileNames = (await fs.readdir(issuesDirectory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  const issues = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(issuesDirectory, fileName);
      const contents = await fs.readFile(filePath, "utf8");
      return issueSchema.parse(JSON.parse(stripBom(contents)));
    }),
  );

  return issues.sort(compareIssuesNewestFirst);
}

export async function getPublicIssues(): Promise<Issue[]> {
  const issues = await getAllIssues();
  return issues.filter((issue) =>
    isIssueVisible(issue.status, process.env.NODE_ENV),
  );
}

export function isIssueVisible(
  status: Issue["status"],
  environment: string | undefined,
) {
  const visibleStatuses: readonly string[] =
    environment === "development" ? approvedIssueStatuses : publicIssueStatuses;

  return visibleStatuses.includes(status);
}

export async function getLatestPublicIssue(): Promise<Issue | null> {
  const issues = await getPublicIssues();
  return issues[0] ?? null;
}

export async function getPublicIssueBySlug(
  slug: string,
): Promise<Issue | null> {
  const issues = await getPublicIssues();
  return issues.find((issue) => issue.slug === slug) ?? null;
}

function compareIssuesNewestFirst(a: Issue, b: Issue) {
  const aDate = a.publishedAt ?? a.period.end;
  const bDate = b.publishedAt ?? b.period.end;
  return bDate.localeCompare(aDate);
}

function stripBom(contents: string) {
  return contents.replace(/^\uFEFF/, "");
}
