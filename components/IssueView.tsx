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
  const topCards = issue.topChangeIds.flatMap((cardId) => {
    const card = issue.cards.find((item) => item.id === cardId);
    return card ? [card] : [];
  });
  const themeLabels = buildThemeLabels(issue);
  const fastTakeaway =
    issue.summary.split("对开发者来说，").at(1) ?? issue.summary;
  const focusCount = toChineseCount(topCards.length);

  return (
    <article>
      <header className={styles.issueHeader}>
        <div className={styles.heroShell}>
          <div className={styles.heroMain}>
            <div className={styles.issueMeta}>
              <span>Issue {String(issue.issueNumber).padStart(3, "0")}</span>
              <span>{issueStatusLabels[issue.status]}</span>
              <span>{formatPeriod(issue.period.start, issue.period.end)}</span>
            </div>
            <p className={styles.eyebrow}>本期核心判断</p>
            <h1>
              <span>AI 开发者本周</span>
              <span>需要关注的{focusCount}件事</span>
            </h1>
            <ul className={styles.topicRail} aria-label="本期主题">
              {themeLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            <div className={styles.coreTakeaway} aria-label="本期 5 秒结论">
              <span>5 秒结论</span>
              <strong>{fastTakeaway}</strong>
            </div>
            <p className={styles.summary}>{issue.summary}</p>
            {!canonicalPage && (
              <Link className={styles.detailLink} href={`/issues/${issue.slug}/`}>
                打开独立期刊页面
              </Link>
            )}
          </div>
          <aside className={styles.heroPanel} aria-label="本期概览">
            <div className={styles.heroVisual} aria-hidden="true">
              <span className={`${styles.visualDot} ${styles.visualDotPrimary}`} />
              <span className={`${styles.visualDot} ${styles.visualDotDark}`} />
              <span className={`${styles.visualDot} ${styles.visualDotWarm}`} />
              <span className={styles.visualLine} />
              <span className={`${styles.visualPill} ${styles.visualPillSource}`}>
                官方来源
              </span>
              <span className={`${styles.visualPill} ${styles.visualPillAction}`}>
                行动建议
              </span>
            </div>
            <p className={styles.panelLabel}>本期重点</p>
            <strong>从资讯到行动</strong>
            <span>事实、影响、成熟度和建议行动同源生成。</span>
            <dl>
              <div>
                <dt>情报卡</dt>
                <dd>{issue.cards.length}</dd>
              </div>
              <div>
                <dt>重点变化</dt>
                <dd>{issue.topChangeIds.length}</dd>
              </div>
              <div>
                <dt>来源</dt>
                <dd>{issue.sources.length}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      {topCards.length > 0 && (
        <section className={styles.topChanges} aria-labelledby="top-changes">
          <div>
            <p className={styles.sectionCode}>01 / Signals</p>
            <h2 id="top-changes">三条重点信号</h2>
            <p className={styles.sectionIntro}>
              先看这三条，快速判断本周 AI 应用开发方向的变化。
            </p>
          </div>
          <ol>
            {topCards.map((card) => (
              <li key={card.id}>
                <a href={`#${card.id}`}>{card.title}</a>
                <p>{card.oneLineSummary}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={styles.cards} aria-label="本期情报卡">
        <div className={styles.cardsHeader}>
          <p className={styles.sectionCode}>02 / 情报卡</p>
          <h2>先看结论，再看事实支撑</h2>
          <p>卡片减少装饰标签，把业务分类高亮，来源和日期置灰。</p>
        </div>
        <div className={styles.cardsGrid}>
          {issue.cards.map((card, index) => (
            <IntelCard
              card={card}
              index={index}
              isKey={keyCardIds.has(card.id)}
              key={card.id}
              sources={issue.sources}
            />
          ))}
        </div>
      </section>

      <section className={styles.actionSection}>
        <div className={styles.opportunities}>
          <p className={styles.sectionCode}>03 / Opportunities</p>
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
          <p className={styles.sectionCode}>04 / Practice</p>
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
          <p className={styles.sectionCode}>05 / Glossary</p>
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
        <p className={styles.sectionCode}>06 / Sources</p>
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

function buildThemeLabels(issue: Issue) {
  const categories = Array.from(new Set(issue.cards.map((card) => card.category)));
  const labels: string[] = [];

  if (categories.some((category) => category.includes("安全"))) {
    labels.push("审核安全");
  }

  if (categories.some((category) => category.includes("Agent"))) {
    labels.push("Agent 基建");
  }

  if (categories.some((category) => category.includes("成本"))) {
    labels.push("成本计量");
  }

  if (categories.some((category) => category.includes("模型"))) {
    labels.push("模型迁移");
  }

  return labels.length > 0 ? labels : categories.slice(0, 4);
}

function toChineseCount(count: number) {
  const labels: Record<number, string> = {
    1: "一",
    2: "两",
    3: "三",
    4: "四",
    5: "五",
    6: "六",
  };

  return labels[count] ?? String(count);
}
