import Image from "next/image";
import Link from "next/link";

import { formatDate, formatPeriod } from "@/lib/content/format";
import { issueStatusLabels } from "@/lib/content/labels";
import {
  getFastTakeaway,
  getIssueThemeLabels,
  getTopCards,
} from "@/lib/content/presentation";
import type { Issue } from "@/lib/content/schema";
import { getSourceTypeLabel } from "@/lib/content/source-labels";

import { IntelCard } from "./IntelCard";
import { InspirationPack } from "./InspirationPack";
import { getInspirationPath, renderInspirationMarkdown } from "@/lib/content/inspiration";
import styles from "./IssueView.module.css";

type IssueViewProps = {
  issue: Issue;
};

function getSourceCardMap(issue: Issue) {
  return new Map(
    issue.sources.map((source) => [
      source.id,
      issue.cards.filter((card) =>
        card.facts.some((fact) => fact.sourceIds.includes(source.id)),
      ),
    ]),
  );
}

export function IssueView({ issue }: IssueViewProps) {
  const keyCardIds = new Set(issue.topChangeIds);
  const topCards = getTopCards(issue);
  const themeLabels = getIssueThemeLabels(issue);
  const fastTakeaway = getFastTakeaway(issue);
  const sourceCardMap = getSourceCardMap(issue);
  const heroVisual = issue.hero?.visual;
  const heroVisualSrc = heroVisual
    ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${heroVisual.src}`
    : null;

  return (
    <article>
      <nav className={styles.returnNav} aria-label="页面导航">
        <Link href="/">返回首页导读</Link>
      </nav>

      <header className={styles.issueHeader}>
        <div
          className={`${styles.heroShell} ${heroVisual ? styles.hasVisual : styles.noVisual}`}
        >
          <div className={styles.heroCopy}>
            <div className={styles.issueMeta}>
              <span>Issue {String(issue.issueNumber).padStart(3, "0")}</span>
              <span>{issueStatusLabels[issue.status]}</span>
              <span>{formatPeriod(issue.period.start, issue.period.end)}</span>
            </div>
            <p className={styles.eyebrow}>完整期刊页</p>
            <h1>
              {issue.hero ? (
                <>
                  <span className={styles.headlineLead}>{issue.hero.lead}</span>
                  <span className={styles.headlineDeck}>{issue.hero.deck}</span>
                </>
              ) : (
                issue.title
              )}
            </h1>
            <ul className={styles.topicRail} aria-label="本期主题">
              {themeLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>

          {heroVisual && heroVisualSrc && (
            <figure className={styles.heroVisual}>
              <div className={styles.visualFrame}>
                <Image
                  alt={heroVisual.alt}
                  height={heroVisual.height}
                  priority
                  sizes="(max-width: 980px) calc(100vw - 4rem), 38vw"
                  src={heroVisualSrc}
                  width={heroVisual.width}
                />
              </div>
              <figcaption>{heroVisual.caption}</figcaption>
            </figure>
          )}

          <div className={styles.heroAnalysis}>
            <div className={styles.coreTakeaway} aria-label="本期 5 秒结论">
              <span>5 秒结论</span>
              <strong>{fastTakeaway}</strong>
            </div>
            {fastTakeaway !== issue.summary && (
              <p className={styles.summary}>{issue.summary}</p>
            )}
          </div>

          <aside className={styles.heroPanel} aria-label="本期概览">
            <p className={styles.panelLabel}>阅读地图</p>
            <strong>建议按这个顺序读</strong>
            <span>详情页用于核查和深读，不再重复首页导读。</span>
            <nav className={styles.readingMap} aria-label="详情页阅读顺序">
              <a href="#top-changes">
                <span>01</span>
                <strong>先看重点信号</strong>
                <small>快速确认本期最重要的变化。</small>
              </a>
              <a href="#ai-verification">
                <span>02</span>
                <strong>理解验证方式</strong>
                <small>知道内容如何经过 AI 交叉校验。</small>
              </a>
              <a href="#source-list">
                <span>03</span>
                <strong>最后查来源索引</strong>
                <small>确认每个来源支撑了哪张情报卡。</small>
              </a>
            </nav>
            <p className={styles.readingTime}>完整阅读约 5 分钟。</p>
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

      <section className={styles.verificationPanel} aria-labelledby="ai-verification">
        <p className={styles.sectionCode}>Auto Verification</p>
        <h2 id="ai-verification">AI 自动验证说明</h2>
        <p>
          本站内容由 AI 自动检索、整理和生成，并经过多轮 AI 交叉校验。构建前会执行字段完整性、
          来源引用、模糊结论表述和链接活体检查。自动验证用于降低错误概率，不能替代原始来源；
          产品信息以官方资料为准，第三方测评只适用于原文所述条件，本站未必独立复现。
        </p>
      </section>

      <section className={styles.cards} aria-label="本期情报卡">
        <div className={styles.cardsHeader}>
          <p className={styles.sectionCode}>02 / 情报卡</p>
          <h2>先看结论，再展开事实支撑</h2>
          <p>默认只展示结论、影响和阅读建议；技术证据与来源可按需展开。</p>
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

      {issue.glossary.length > 0 && (
        <section className={styles.glossary} aria-labelledby="glossary">
          <p className={styles.sectionCode}>03 / Glossary</p>
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

      <InspirationPack
        markdown={renderInspirationMarkdown(issue)}
        href={getInspirationPath(issue.slug, process.env.NEXT_PUBLIC_BASE_PATH)}
        filename={`ai-outpost-issue-${String(issue.issueNumber).padStart(3, "0")}.md`}
      />

      <section className={styles.sources} aria-labelledby="source-list">
        <p className={styles.sectionCode}>04 / Sources</p>
        <h2 id="source-list">来源索引</h2>
        <p className={styles.sourceIntro}>
          这里区分官方资料、独立测评和博主实测自述，并标注它们支撑的情报卡。卡片内链接用于就地核查，
          这里用于查看整期来源结构。
        </p>
        <details className={styles.sourceDetails}>
          <summary>
            <span>展开 {issue.sources.length} 个原始来源与对应情报</span>
            <small>用于核查，不影响正文阅读</small>
          </summary>
          <ol>
            {issue.sources.map((source, index) => {
              const supportedCards = sourceCardMap.get(source.id) ?? [];

              return (
                <li key={source.id}>
                  <span className={styles.sourceNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a href={source.url} rel="noreferrer" target="_blank">
                    {source.title}
                  </a>
                  <span className={styles.sourceMeta}>
                    {getSourceTypeLabel(source)} · {source.publisher} ·{" "}
                    {source.publishedAt
                      ? formatDate(source.publishedAt)
                      : "来源页面未标注发布日期"}
                  </span>
                  {supportedCards.length > 0 && (
                    <div className={styles.sourceCards}>
                      <strong>支撑情报</strong>
                      <ul>
                        {supportedCards.map((card) => (
                          <li key={card.id}>
                            <a href={`#${card.id}`}>{card.title}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </details>
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

      <section className={styles.contactPanel} aria-label="联系与投稿">
        <span>邮件联系 / 投稿</span>
        <span className={styles.contactEmail}>RNX100823@outlook.com</span>
      </section>
    </article>
  );
}
