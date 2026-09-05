import Link from "next/link";

import { formatPeriod } from "@/lib/content/format";
import { issueStatusLabels } from "@/lib/content/labels";
import {
  getFastTakeaway,
  getIssueThemeLabels,
  getTopCards,
  getWeeklyImpactBullets,
  toChineseCount,
} from "@/lib/content/presentation";
import type { Issue } from "@/lib/content/schema";

import styles from "./HomeIssueSummary.module.css";

type HomeIssueSummaryProps = {
  issue: Issue;
};

export function HomeIssueSummary({ issue }: HomeIssueSummaryProps) {
  const topCards = getTopCards(issue);
  const themeLabels = getIssueThemeLabels(issue);
  const fastTakeaway = getFastTakeaway(issue);
  const focusCount = toChineseCount(topCards.length);
  const weeklyImpacts = getWeeklyImpactBullets(issue);
  const topicSummary =
    themeLabels.filter((label) => label !== "官方来源").join(" / ") ||
    "AI 应用开发变化";
  const detailHref = `/issues/${issue.slug}/`;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.issueMeta}>
            <span>Issue {String(issue.issueNumber).padStart(3, "0")}</span>
            <span>{issueStatusLabels[issue.status]}</span>
            <span>{formatPeriod(issue.period.start, issue.period.end)}</span>
          </div>
          <p className={styles.eyebrow}>最新一期导读</p>
          <h1>{issue.title}</h1>
          <ul className={styles.topicRail} aria-label="本期主题">
            {themeLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <div className={styles.coreTakeaway} aria-label="本期 5 秒结论">
            <span>5 秒结论</span>
            <strong>{fastTakeaway}</strong>
          </div>
          <p className={styles.summary}>
            首页只保留导读信息。完整情报卡、技术实据、来源链接和术语解释，
            请进入本期完整页面阅读。
          </p>
          <div className={styles.ctaRow}>
            <Link className={styles.primaryCta} href={detailHref}>
              查看完整分析（{issue.cards.length}条情报）
            </Link>
            <Link className={styles.secondaryCta} href={`${detailHref}#source-list`}>
              查看全部来源与实据
            </Link>
          </div>
        </div>

        <aside className={styles.valuePanel} aria-label="本期阅读价值">
          <p className={styles.panelCode}>本期你会获得什么</p>
          <h2>用 30 秒判断是否值得深读</h2>
          <ol>
            <li>
              <span>01</span>
              <strong>本周最该看的变化</strong>
              <small>从官方来源里筛出重点，不追求新闻数量。</small>
            </li>
            <li>
              <span>02</span>
              <strong>对开发者的影响</strong>
              <small>解释这些变化和 AI 应用开发、Vibe Coding 的关系。</small>
            </li>
            <li>
              <span>03</span>
              <strong>来源与风险边界</strong>
              <small>进入详情页后可查看官方链接、事实支撑和限制条件。</small>
            </li>
          </ol>
          <dl>
            <div>
              <dt>适合谁</dt>
              <dd>AI 新手 / Vibe Coding 学习者 / 独立开发者</dd>
            </div>
            <div>
              <dt>本期主题</dt>
              <dd>{topicSummary}</dd>
            </div>
          </dl>
        </aside>
      </header>

      {topCards.length > 0 && (
        <section className={styles.signals} aria-labelledby="home-signals">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionCode}>01 / Signals</p>
            <h2 id="home-signals">{focusCount}条重点信号</h2>
            <p>先看这些信号，判断本周 AI 应用开发方向是否与你有关。</p>
          </div>
          <ol>
            {topCards.map((card) => (
              <li key={card.id}>
                <Link href={`${detailHref}#${card.id}`}>{card.title}</Link>
                <p>{card.oneLineSummary}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {weeklyImpacts.length > 0 && (
        <section className={styles.impact} aria-labelledby="weekly-impact">
          <div>
            <p className={styles.sectionCode}>02 / Impact</p>
            <h2 id="weekly-impact">本周最大的影响</h2>
          </div>
          <ul>
            {weeklyImpacts.map((impact) => (
              <li key={impact}>{impact}</li>
            ))}
          </ul>
        </section>
      )}

    </main>
  );
}
