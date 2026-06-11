import { EmptyIssueState } from "@/components/EmptyIssueState";
import { IssueView } from "@/components/IssueView";
import { getLatestPublicIssue } from "@/lib/content/repository";

export default async function HomePage() {
  const issue = await getLatestPublicIssue();
  return issue ? <IssueView issue={issue} /> : <EmptyIssueState />;
}
