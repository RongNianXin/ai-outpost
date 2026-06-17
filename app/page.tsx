import { EmptyIssueState } from "@/components/EmptyIssueState";
import { HomeIssueSummary } from "@/components/HomeIssueSummary";
import { getLatestPublicIssue } from "@/lib/content/repository";

export default async function HomePage() {
  const issue = await getLatestPublicIssue();
  return issue ? <HomeIssueSummary issue={issue} /> : <EmptyIssueState />;
}
