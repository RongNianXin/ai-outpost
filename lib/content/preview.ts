import { compareIssuesNewestFirst } from "./repository";
import { approvedIssueStatuses, type Issue } from "./schema";

const defaultPreviewBaseUrl = "http://127.0.0.1:3100";

export function selectPreviewIssue(issues: Issue[], requestedSlug?: string) {
  if (requestedSlug) {
    const requestedIssue = issues.find((issue) => issue.slug === requestedSlug);
    if (!requestedIssue) {
      throw new Error(`Unknown issue slug: ${requestedSlug}`);
    }
    if (!isPreviewable(requestedIssue)) {
      throw new Error(
        `Issue ${requestedSlug} is not previewable while status is ${requestedIssue.status}.`,
      );
    }
    return requestedIssue;
  }

  const latestIssue = issues
    .filter(isPreviewable)
    .sort(compareIssuesNewestFirst)[0];

  if (!latestIssue) {
    throw new Error("No approved or public issue is available for preview.");
  }

  return latestIssue;
}

export function buildPreviewUrl(
  issue: Pick<Issue, "slug">,
  baseUrl = defaultPreviewBaseUrl,
) {
  return `${baseUrl.replace(/\/$/, "")}/issues/${issue.slug}/`;
}

function isPreviewable(issue: Issue) {
  return approvedIssueStatuses.includes(
    issue.status as (typeof approvedIssueStatuses)[number],
  );
}
