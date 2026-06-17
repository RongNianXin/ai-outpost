import { formatDate, formatPeriod } from "@/lib/content/format";
import {
  issueStatusLabels,
  opportunityLevelDescriptions,
  opportunityLevelLabels,
} from "@/lib/content/labels";
import type { Issue } from "@/lib/content/schema";

import { IntelCard } from "./IntelCard";
import styles from "./IssueView.module.css";

type IssueViewProps = {
  issue: Issue;
};

export function IssueView({ issue }: IssueViewProps) {
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
          </div>
          <aside className={styles.heroPanel} aria-label="本期概览">
            <div className={styles.heroPipeline} aria-label="从资讯到行动流程">
              <div>
                <span>01</span>
                <strong>官方来源</strong>
                <small>保留发布日期和原始链接</small>
              </div>
              <div>
                <span>02</span>
                <strong>影响分析</strong>
                <small>拆出开发者需要理解的变化</small>
              </div>
              <div>
                <span>03</span>
                <strong>行动建议</strong>
                <small>转成可学习、收藏或验证的任务</small>
              </div>
            </div>
            <p className={styles.panelLabel}>本期重点</p>
            <strong>从资讯到行动</strong>
            <span>事实、影响、风险和建议行动同源生成。</span>
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

      <section className={styles.verificationPanel} aria-labelledby="ai-verification">
        <p className={styles.sectionCode}>Auto Verification</p>
        <h2 id="ai-verification">AI 自动验证说明</h2>
        <p>
          本站内容由 AI 自动检索、整理和生成，并经过多轮 AI 交叉校验。构建前会执行字段完整性、
          来源引用、模糊行动表述和链接活体检查。自动验证用于降低错误概率，不能替代原始来源；
          重要信息请以官方链接为准。
        </p>
      </section>

      <section className={styles.cards} aria-label="本期情报卡">
        <div className={styles.cardsHeader}>
          <p className={styles.sectionCode}>02 / 情报卡</p>
          <h2>先看结论，再展开事实支撑</h2>
          <p>默认只展示结论、影响和行动建议；技术证据与来源可按需展开。</p>
        </div>
        <div className={styles.cardsGrid}>
          {issue.cards.map((card, index) => (
            <IntelCard
              card={card}
              index={index}
              isKey={keyCardIds.has(card.id)}
              isPracticeRelated={issue.practiceTask.relatedCardIds.includes(
                card.id,
              )}
              key={card.id}
              sources={issue.sources}
            />
          ))}
        </div>
      </section>

      <section className={styles.actionSection}>
        <div className={styles.opportunities}>
          <p className={styles.sectionCode}>03 / Opportunities</p>
          <h2>可以尝试的小项目</h2>
          {issue.opportunities.length > 0 ? (
            issue.opportunities.map((opportunity) => (
              <article key={opportunity.id}>
                <span>
                  行动级别：{opportunityLevelLabels[opportunity.confidence]}
                </span>
                <h3>{opportunity.title}</h3>
                <p className={styles.opportunityPlain}>
                  {opportunity.plainLanguage}
                </p>
                <p>{opportunity.rationale}</p>
                <small>
                  {opportunityLevelDescriptions[opportunity.confidence]}
                </small>
              </article>
            ))
          ) : (
            <p className={styles.muted}>本期没有足够明确的产品机会。</p>
          )}
        </div>

        <aside className={styles.practice} id="weekly-practice">
          <p className={styles.sectionCode}>04 / Practice</p>
          <h2>本周实践</h2>
          <p className={styles.duration}>
            {issue.practiceTask.durationMinutes} 分钟
          </p>
          <h3>{issue.practiceTask.title}</h3>
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

      <section className={styles.subscribePanel} aria-label="订阅与反馈">
        <a href="mailto:?subject=订阅下一期 AI 前哨站">[ 订阅下一期 ]</a>
        <span>|</span>
        <a href="mailto:?subject=提交 AI 情报给 AI 前哨站">
          [ 提交你的 AI 情报 ]
        </a>
      </section>
    </article>
  );
}

function buildThemeLabels(issue: Issue) {
  const categories = Array.from(new Set(issue.cards.map((card) => card.category)));
  const labels: string[] = ["官方来源"];

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

  if (categories.some((category) => category.includes("多模态"))) {
    labels.push("多模态");
  }

  return labels.length > 1 ? labels.slice(0, 4) : categories.slice(0, 4);
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
