import type { Metadata } from "next";
import Link from "next/link";

import { formatDate } from "@/lib/content/format";
import { getPublicIssues } from "@/lib/content/repository";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "历史归档",
  description: "AI 前哨站往期情报周报归档。",
};

export default async function ArchivePage() {
  const issues = await getPublicIssues();

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.kicker}>Archive / Published issues</p>
        <h1>历史归档</h1>
        <p>这里保存所有通过自动化验证并公开发布的 AI 前哨站周报，以及公开的更正记录。</p>
      </header>
      {issues.length > 0 ? (
        <ol className={styles.issueList}>
          {issues.map((issue) => (
            <li key={issue.id}>
              <span className={styles.issueNumber}>
                {String(issue.issueNumber).padStart(3, "0")}
              </span>
              <div>
                <Link href={`/issues/${issue.slug}/`}>{issue.title}</Link>
                <p>{issue.summary}</p>
              </div>
              <time dateTime={issue.publishedAt ?? undefined}>
                {issue.publishedAt ? formatDate(issue.publishedAt) : "待发布"}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.empty}>第一期尚未发布。通过自动化验证并公开后会出现在这里。</p>
      )}
    </div>
  );
}
