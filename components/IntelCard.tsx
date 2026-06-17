import {
  strategyDescriptions,
  strategyLabels,
  technicalRiskLabels,
} from "@/lib/content/labels";
import type {
  EvidenceSource,
  IntelCard as IntelCardData,
} from "@/lib/content/schema";

import styles from "./IntelCard.module.css";

type IntelCardProps = {
  card: IntelCardData;
  index: number;
  isKey: boolean;
  sources: EvidenceSource[];
};

export function IntelCard({
  card,
  index,
  isKey,
  sources,
}: IntelCardProps) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const cardClassName = isKey ? `${styles.card} ${styles.keyCard}` : styles.card;
  const cardNumber = String(index + 1).padStart(2, "0");
  const factSourceCount = new Set(
    card.facts.flatMap((fact) => fact.sourceIds),
  ).size;
  const officialSources = Array.from(
    new Set(card.facts.flatMap((fact) => fact.sourceIds)),
  ).flatMap((sourceId) => {
    const source = sourceById.get(sourceId);
    return source ? [source] : [];
  });

  return (
    <article className={cardClassName} id={card.id}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h2>{card.title}</h2>
          <div className={styles.meta}>
            <span className={styles.number}>{cardNumber}</span>
            <span className={styles.categoryBadge}>{card.category}</span>
            <span className={styles.metaMuted}>{card.publisher}</span>
            <time className={styles.metaMuted} dateTime={card.occurredAt}>
              {card.occurredAt}
            </time>
          </div>
          <p className={styles.conclusionLabel}>
            {isKey ? "重点情报" : "情报简讯"} · 结论
          </p>
          <p className={styles.summary}>{card.oneLineSummary}</p>
        </div>

        <div className={styles.insightGrid}>
          <section>
            <h3>对开发者的影响</h3>
            <p>{card.developerImpact}</p>
          </section>
          <section>
            <h3>为什么重要</h3>
            <p>{card.whyItMatters}</p>
          </section>
        </div>

        <aside className={styles.actionPanel} aria-label="阅读建议与技术风险">
          <span>阅读建议</span>
          <strong>{strategyLabels[card.suggestedAction]}</strong>
          <p>{strategyDescriptions[card.suggestedAction]}</p>
          <small>技术风险：{technicalRiskLabels[card.reviewRisk]}</small>
        </aside>
      </header>

      <details className={styles.evidence}>
        <summary>
          <span>[ 展开技术实据与来源 ]</span>
          <small>{factSourceCount} 个官方来源</small>
        </summary>
        <div className={styles.evidenceBody}>
          <section className={styles.factPanel} aria-label="事实支撑">
            <div className={styles.factPanelHeader}>
              <h3>事实支撑验证</h3>
              <span>{factSourceCount} 个官方来源</span>
            </div>
            <ul className={styles.factList}>
              {card.facts.map((fact) => (
                <li key={fact.id}>
                  <p>{fact.claim}</p>
                  {fact.limitations.length > 0 && (
                    <ul className={styles.factLimits}>
                      {fact.limitations.map((limitation) => (
                        <li key={limitation}>{limitation}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {officialSources.length > 0 && (
            <nav className={styles.sourceShortcuts} aria-label="官方链接">
              <span>官方链接</span>
              {officialSources.map((source) => (
                <a
                  href={source.url}
                  key={source.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.publisher}：{source.title}
                </a>
              ))}
            </nav>
          )}
        </div>
      </details>
    </article>
  );
}
