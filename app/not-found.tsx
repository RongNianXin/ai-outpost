import Link from "next/link";

import styles from "./simple-page.module.css";

export default function NotFoundPage() {
  return (
    <article className={styles.page}>
      <p className={styles.kicker}>404</p>
      <h1>这条情报不存在</h1>
      <p>链接可能已更正，或者该内容尚未发布。</p>
      <Link href="/">返回最新一期</Link>
    </article>
  );
}
