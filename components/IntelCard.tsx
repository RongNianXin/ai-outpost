import { technicalRiskLabels } from "@/lib/content/labels";
import type {
  EvidenceSource,
  IntelCard as IntelCardData,
} from "@/lib/content/schema";

import styles from "./IntelCard.module.css";
import { getSourceTypeLabel } from "@/lib/content/source-labels";

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
  const toneClassName = [styles.cardToneA, styles.cardToneB, styles.cardToneC][
    index % 3
  ];
  const cardClassName = [
    styles.card,
    toneClassName,
    isKey ? styles.keyCard : "",
  ]
    .filter(Boolean)
    .join(" ");
  const cardNumber = String(index + 1).padStart(2, "0");
  const factSourceCount = new Set(
    card.facts.flatMap((fact) => fact.sourceIds),
  ).size;
  const citedSources = Array.from(
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
            {isKey ? "重点情报" : "情报简讯"}
          </p>
        </div>

        <div className={styles.insightGrid}>
          <section>
            <h3>内容详情</h3>
            <p className={styles.detailText}>{card.oneLineSummary}</p>
          </section>
          <section>
            <h3>造成的影响</h3>
            <p>{card.whyItMatters}</p>
          </section>
        </div>

      </header>

      <details className={styles.evidence}>
        <summary>
          <span>[ 展开技术实据与来源 ]</span>
          <small>{factSourceCount} 个原始来源</small>
        </summary>
        <div className={styles.evidenceBody}>
          <p className={styles.riskBadge}>
            技术风险：{technicalRiskLabels[card.reviewRisk]}
          </p>

          <section className={styles.actionReference} aria-label="行动参考">
            <h3>行动参考</h3>
            <p>{card.developerImpact}</p>
          </section>

          <section className={styles.factPanel} aria-label="事实支撑">
            <div className={styles.factPanelHeader}>
              <h3>事实、测评与限制</h3>
              <span>{factSourceCount} 个原始来源</span>
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

          {citedSources.length > 0 && (
            <nav className={styles.sourceShortcuts} aria-label="原始来源">
              <span>原始来源</span>
              {citedSources.map((source) => (
                <a
                  href={source.url}
                  key={source.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  [{getSourceTypeLabel(source)}] {source.publisher}：{source.title}
                </a>
              ))}
            </nav>
          )}
        </div>
      </details>
    </article>
  );
}
