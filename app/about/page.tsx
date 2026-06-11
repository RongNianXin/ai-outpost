import type { Metadata } from "next";

import styles from "../simple-page.module.css";

export const metadata: Metadata = {
  title: "关于",
  description: "了解 AI 前哨站的来源、审核方法和内容原则。",
};

export default function AboutPage() {
  return (
    <article className={styles.page}>
      <p className={styles.kicker}>Method</p>
      <h1>关于 AI 前哨站</h1>
      <p>
        AI 前哨站不是新闻聚合器，而是一份帮助 AI 应用创造者从变化走向行动的低维护情报简报。
        每周运行一次筛选流程，但只有值得分享的内容才会发布。
      </p>
      <h2>来源原则</h2>
      <p>
        优先使用官方博客、产品文档、更新日志和 GitHub Releases。社交媒体只用于发现线索，
        无法回溯到可信官方来源的信息不会作为事实发布。
      </p>
      <h2>三层内容</h2>
      <p>
        “AI 交叉核查事实”说明官方真正发布了什么；“影响分析”解释它与 AI
        应用开发者的关系；“行动建议”给出此刻更适合忽略、收藏、学习还是动手验证。
      </p>
      <h2>人工最终批准</h2>
      <p>
        AI 协助收集、去重、分类、评分、起草和质检，但正式内容必须经过人工批准。
        没有明确证据定位的候选直接淘汰。发布后发现错误时会留下公开更正记录。
      </p>
    </article>
  );
}
