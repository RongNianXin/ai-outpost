import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyIssueState } from "@/components/EmptyIssueState";
import { IssueView } from "@/components/IssueView";
import {
  getPublicIssueBySlug,
  getPublicIssues,
} from "@/lib/content/repository";

type IssuePageProps = {
  params: Promise<{ slug: string }>;
};

const emptyIssueSlug = "__no-public-issues__";

export const dynamicParams = false;

export async function generateStaticParams() {
  const issues = await getPublicIssues();
  if (issues.length === 0) {
    return [{ slug: emptyIssueSlug }];
  }
  return issues.map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({
  params,
}: IssuePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === emptyIssueSlug) {
    return {
      title: "暂无公开期刊",
    };
  }

  const issue = await getPublicIssueBySlug(slug);

  return issue
    ? {
        title: issue.title,
        description: issue.summary,
      }
    : {
        title: "期刊不存在",
      };
}

export default async function IssuePage({ params }: IssuePageProps) {
  const { slug } = await params;
  if (slug === emptyIssueSlug) {
    return <EmptyIssueState />;
  }

  const issue = await getPublicIssueBySlug(slug);

  if (!issue) {
    notFound();
  }

  return <IssueView canonicalPage issue={issue} />;
}
