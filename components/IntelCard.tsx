import {
  actionLabels,
  maturityLabels,
  noiseRiskLabels,
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
  const factSourceCount = new Set(
    card.facts.flatMap((fact) => fact.sourceIds),
  ).size;

  return (
    <article className={cardClassName} id={card.id}>
      <header className={styles.header}>
        <div className={styles.numberBlock}>
          <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
          <span>{isKey ? "重点情报" : "情报简讯"}</span>
        </div>
        <div className={styles.titleBlock}>
          <div className={styles.meta}>
            <span>{card.category}</span>
            <span>{card.publisher}</span>
            <time dateTime={card.occurredAt}>{card.occurredAt}</time>
          </div>
          <h2>{card.title}</h2>
          <p className={styles.conclusionLabel}>一句话结论</p>
          <p className={styles.summary}>{card.oneLineSummary}</p>
        </div>
        <aside className={styles.actionPanel} aria-label="建议行动与风险标签">
          <span>建议行动</span>
          <strong>{actionLabels[card.suggestedAction]}</strong>
          <small>
            {maturityLabels[card.maturity]} · 噪声{noiseRiskLabels[card.noiseRisk]}
          </small>
        </aside>
      </header>

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

      <div className={styles.analysisGrid}>
        <section>
          <h3>为什么值得关注</h3>
          <p>{card.whyItMatters}</p>
        </section>
        <section>
          <h3>对应用开发者的影响</h3>
          <p>{card.developerImpact}</p>
        </section>
      </div>

      <details className={styles.evidence}>
        <summary>查看原始来源链接</summary>
        <ul>
          {card.facts.map((fact) => (
            <li key={fact.id}>
              <p>{fact.claim}</p>
              {fact.limitations.length > 0 && (
                <p className={styles.limitations}>
                  限制：{fact.limitations.join("；")}
                </p>
              )}
              <div className={styles.sourceLinks}>
                {fact.sourceIds.map((sourceId) => {
                  const source = sourceById.get(sourceId);
                  return source ? (
                    <a
                      href={source.url}
                      key={source.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {source.publisher}：{source.title}
                    </a>
                  ) : null;
                })}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
