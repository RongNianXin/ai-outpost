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
          <p className={styles.summary}>{card.oneLineSummary}</p>
        </div>
      </header>

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

      <dl className={styles.signalGrid}>
        <div>
          <dt>成熟度</dt>
          <dd className={styles.badge}>{maturityLabels[card.maturity]}</dd>
        </div>
        <div>
          <dt>营销噪声</dt>
          <dd className={styles.badge}>{noiseRiskLabels[card.noiseRisk]}</dd>
        </div>
        <div>
          <dt>建议行动</dt>
          <dd className={`${styles.badge} ${styles.action}`}>
            {actionLabels[card.suggestedAction]}
          </dd>
        </div>
      </dl>

      <details className={styles.evidence}>
        <summary>查看 AI 交叉核查事实与原始来源</summary>
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
