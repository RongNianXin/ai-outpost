import Link from "next/link";

import styles from "./EmptyIssueState.module.css";

export function EmptyIssueState() {
  return (
    <section className={styles.emptyState} aria-labelledby="empty-title">
      <div>
        <p className={styles.eyebrow}>Preparing issue 001</p>
        <h1 id="empty-title">把 AI 资讯变成下一步行动</h1>
      </div>
      <div className={styles.summary}>
        <p>
          第一份情报正在准备中。这里不会滚动堆放所有新闻，而会留下少量有官方依据、与你的开发实践真正相关的变化。
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/about/">
            了解编辑方法
          </Link>
          <Link href="/archive/">查看历史归档</Link>
        </div>
      </div>
      <dl className={styles.promiseGrid}>
        <div>
          <dt>最多 6 条</dt>
          <dd>少而重要，不为更新频率凑数。</dd>
        </div>
        <div>
          <dt>官方来源</dt>
          <dd>每项硬事实都保留证据入口。</dd>
        </div>
        <div>
          <dt>立即行动</dt>
          <dd>每期给出一项 30 至 120 分钟实践。</dd>
        </div>
      </dl>
    </section>
  );
}
