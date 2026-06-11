import Link from "next/link";

import { formatDate, formatPeriod } from "@/lib/content/format";
import { issueStatusLabels } from "@/lib/content/labels";
import type { Issue } from "@/lib/content/schema";

import { IntelCard } from "./IntelCard";
import styles from "./IssueView.module.css";

type IssueViewProps = {
  issue: Issue;
  canonicalPage?: boolean;
};

export function IssueView({ issue, canonicalPage = false }: IssueViewProps) {
  const keyCardIds = new Set(issue.topChangeIds);

  return (
    <article>
      <header className={styles.issueHeader}>
        <div className={styles.issueMeta}>
          <span>Issue {String(issue.issueNumber).padStart(3, "0")}</span>
          <span>{issueStatusLabels[issue.status]}</span>
          <span>{formatPeriod(issue.period.start, issue.period.end)}</span>
        </div>
        <div className={styles.titleGrid}>
          <h1>{issue.title}</h1>
          <div>
            <p className={styles.summary}>{issue.summary}</p>
            {!canonicalPage && (
              <Link className={styles.detailLink} href={`/issues/${issue.slug}/`}>
                打开独立期刊页面
              </Link>
            )}
          </div>
        </div>
      </header>

      {issue.topChangeIds.length > 0 && (
        <section className={styles.topChanges} aria-labelledby="top-changes">
          <div>
            <p className={styles.sectionCode}>01 / Signals</p>
            <h2 id="top-changes">本期重要变化</h2>
          </div>
          <ol>
            {issue.topChangeIds.map((cardId) => {
              const card = issue.cards.find((item) => item.id === cardId);
              return card ? (
                <li key={card.id}>
                  <a href={`#${card.id}`}>{card.title}</a>
                  <p>{card.oneLineSummary}</p>
                </li>
              ) : null;
            })}
          </ol>
        </section>
      )}

      <section className={styles.cards} aria-label="本期情报卡">
        {issue.cards.map((card, index) => (
          <IntelCard
            card={card}
            index={index}
            isKey={keyCardIds.has(card.id)}
            key={card.id}
            sources={issue.sources}
          />
        ))}
      </section>

      <section className={styles.actionSection}>
        <div className={styles.opportunities}>
          <p className={styles.sectionCode}>02 / Opportunities</p>
          <h2>可能的产品机会</h2>
          {issue.opportunities.length > 0 ? (
            issue.opportunities.map((opportunity) => (
              <article key={opportunity.id}>
                <span>置信度：{confidenceLabel(opportunity.confidence)}</span>
                <h3>{opportunity.title}</h3>
                <p>{opportunity.rationale}</p>
              </article>
            ))
          ) : (
            <p className={styles.muted}>本期没有足够明确的产品机会。</p>
          )}
        </div>

        <aside className={styles.practice}>
          <p className={styles.sectionCode}>03 / Practice</p>
          <p className={styles.duration}>
            {issue.practiceTask.durationMinutes} 分钟
          </p>
          <h2>{issue.practiceTask.title}</h2>
          <p>{issue.practiceTask.objective}</p>
          <ol>
            {issue.practiceTask.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </aside>
      </section>

      {issue.glossary.length > 0 && (
        <section className={styles.glossary} aria-labelledby="glossary">
          <p className={styles.sectionCode}>04 / Glossary</p>
          <h2 id="glossary">术语解释</h2>
          <dl>
            {issue.glossary.map((entry) => (
              <div key={entry.term}>
                <dt>{entry.term}</dt>
                <dd>{entry.explanation}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className={styles.sources} aria-labelledby="source-list">
        <p className={styles.sectionCode}>05 / Sources</p>
        <h2 id="source-list">原始来源</h2>
        <ol>
          {issue.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} rel="noreferrer" target="_blank">
                {source.title}
              </a>
              <span>
                {source.publisher} ·{" "}
                {source.publishedAt
                  ? formatDate(source.publishedAt)
                  : "官方页面未标注发布日期"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {issue.corrections.length > 0 && (
        <section className={styles.corrections} aria-labelledby="corrections">
          <h2 id="corrections">更正记录</h2>
          <ul>
            {issue.corrections.map((correction) => (
              <li key={`${correction.correctedAt}-${correction.description}`}>
                <time dateTime={correction.correctedAt}>
                  {formatDate(correction.correctedAt)}
                </time>
                <p>{correction.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function confidenceLabel(confidence: "low" | "medium" | "high") {
  return {
    low: "低",
    medium: "中",
    high: "高",
  }[confidence];
}
