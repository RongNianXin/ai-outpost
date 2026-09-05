import { getPublicIssueBySlug, getPublicIssues } from "@/lib/content/repository";
import { renderInspirationMarkdown } from "@/lib/content/inspiration";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const issues = await getPublicIssues();
  return issues.length ? issues.map((issue) => ({ slug: issue.slug }))
    : [{ slug: "__no-public-issues__" }];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const issue = await getPublicIssueBySlug(slug);
  if (!issue) return new Response("Not found", { status: 404 });
  return new Response(renderInspirationMarkdown(issue), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="ai-outpost-${issue.id}.md"`,
    },
  });
}
