import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: {
    default: "AI 前哨站",
    template: "%s | AI 前哨站",
  },
  description:
    "持续观察 AI 前沿变化，帮助 AI 应用创造者看懂趋势、发现机会，并将资讯转化为实际行动。",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link className={styles.brand} href="/">
              <span className={styles.brandMark}>AI</span>
              <span>
                <strong>AI 前哨站</strong>
                <small>AI Outpost</small>
              </span>
            </Link>
            <nav aria-label="主导航">
              <ul className={styles.navList}>
                <li>
                  <Link href="/">最新一期</Link>
                </li>
                <li>
                  <Link href="/archive/">历史归档</Link>
                </li>
                <li>
                  <Link href="/about/">关于</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className={styles.footer}>
          <p>看见变化，理解影响，立即行动。</p>
          <p>内容经 AI 辅助整理，重要事实由人工批准后发布。</p>
        </footer>
      </body>
    </html>
  );
}
