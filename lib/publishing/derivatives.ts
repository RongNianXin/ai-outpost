import {
  actionLabels,
  maturityLabels,
  noiseRiskLabels,
} from "../content/labels";
import type { EvidenceSource, Issue } from "../content/schema";
import { getSourceTypeLabel } from "../content/source-labels";

const SITE_ORIGIN = "https://rongnianxin.github.io/ai-outpost";

export function getPublicIssueUrl(issue: Issue) {
  return `${SITE_ORIGIN}/issues/${issue.slug}/`;
}

export function renderWechatHtml(issue: Issue): string {
  const sourceById = new Map(
    issue.sources.map((source) => [source.id, source]),
  );
  const heroLead = issue.hero?.lead ?? issue.title;
  const heroDeck = issue.hero?.deck ?? issue.summary;
  const sections: string[] = [];

  const topics = Array.from(new Set(issue.cards.map((card) => card.category))).slice(0, 4);
  sections.push(
    `<section style="margin:0 0 23px;padding:23px 18px;border:1px solid #d8e2ee;border-radius:18px;background-color:#f4f8ff;">`,
    paragraph("AI 前哨站 / AI OUTPOST", "font-size:13px;letter-spacing:1px;font-weight:700;color:#2563eb;margin-bottom:13px;"),
    paragraph(`第 ${String(issue.issueNumber).padStart(3, "0")} 期 · ${issue.period.start.replaceAll("-", ".")}—${issue.period.end.replaceAll("-", ".")}`, "font-family:Consolas,monospace;font-size:12px;color:#5d6b82;margin-bottom:23px;"),
    `<h1 style="margin:0 0 15px;font-size:36px;line-height:1.2;font-weight:800;letter-spacing:-0.8px;color:#0b1220;">${escapeHtml(heroLead)}</h1>`,
    paragraph(heroDeck, "font-size:21px;line-height:1.55;font-weight:700;color:#2a3d59;margin-bottom:22px;"),
    `<p style="margin:0 0 20px;line-height:2.5;word-break:break-word;">${topics.map((topic) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:2px 10px;border:1px solid #d8e2ee;border-radius:10px;background-color:#ffffff;font-size:12px;line-height:1.9;color:#2a3d59;font-weight:700;">${escapeHtml(topic)}</span>`).join("")}</p>`,
    paragraph(issue.summary, "font-size:16px;margin-bottom:0;"),
    `</section>`,
  );

  if (issue.topChangeIds.length > 0) {
    const items = issue.topChangeIds
      .map((cardId) => issue.cards.find((card) => card.id === cardId))
      .filter((card): card is Issue["cards"][number] => Boolean(card))
      .map(
        (card, index) =>
          `<p style="margin:0 0 12px;font-size:16px;line-height:1.8;color:#182235;word-break:break-word;"><strong style="color:#0f766e;">${index + 1}</strong>　<strong>${escapeHtml(card.title)}</strong><br><span style="color:#475569;">${escapeHtml(card.oneLineSummary)}</span></p>`,
      )
      .join("");
    sections.push(heading("这周先看这三件事"), items);
  }

  issue.cards.forEach((card, index) => {
    const facts = card.facts
      .map((fact) => {
        const markers = renderSourceMarkers(fact.sourceIds, sourceById);
        const limitations = fact.limitations
          .map(
            (limitation) =>
              `<li style="margin:5px 0;color:#64748b;">限制：${escapeHtml(limitation)}</li>`,
          )
          .join("");
        return `<li style="margin:0 0 12px;">${escapeHtml(fact.claim)}${markers}<ul style="padding-left:18px;margin:7px 0 0;font-size:13px;line-height:1.7;">${limitations}</ul></li>`;
      })
      .join("");

    sections.push(
      `<section style="margin:0 0 23px;padding:23px 18px;border:1px solid #bdd1f5;border-left:4px solid #2563eb;border-radius:18px;background-color:#ffffff;">`,
      paragraph(`情报 ${String(index + 1).padStart(2, "0")} · ${card.category}`, "font-family:Consolas,Arial,sans-serif;font-size:13px;font-weight:700;color:#2563eb;margin-bottom:12px;"),
      `<h2 style="margin:0 0 17px;font-size:25px;line-height:1.4;font-weight:800;color:#0b1220;">${escapeHtml(card.title)}</h2>`,
      paragraph(`${card.occurredAt.replaceAll("-", ".")} · ${card.publisher}`, "font-size:12px;color:#5d6b82;margin-bottom:20px;"),
      `<section style="margin:20px 0;padding:15px 14px;border-left:3px solid #2563eb;border-radius:0 10px 10px 0;background-color:#eff6ff;">${paragraph("先看结论", "font-size:12px;color:#2563eb;font-weight:700;margin-bottom:7px;")}${paragraph(card.oneLineSummary, "font-weight:700;margin-bottom:0;")}</section>`,
      heading("为什么值得关注"),
      paragraph(card.whyItMatters, "font-size:15px;line-height:1.85;color:#334155;"),
      `<section style="margin:20px 0;padding:15px 14px;border:1px solid #f3d28d;border-radius:12px;background-color:#fff8e8;">${paragraph("对你的影响与建议", "font-size:13px;font-weight:700;color:#7a4a00;margin-bottom:8px;")}${paragraph(card.developerImpact, "color:#544017;margin-bottom:0;")}</section>`,
      paragraph(`编辑判断 · 成熟度：${maturityLabels[card.maturity]} / 噪声风险：${noiseRiskLabels[card.noiseRisk]} / 建议：${actionLabels[card.suggestedAction]}`, "font-size:12px;color:#5d6b82;margin-bottom:12px;"),
      `<p style="margin:16px 0 6px;font-size:14px;line-height:1.75;color:#2563eb;font-weight:700;word-break:break-word;">事实、测评与限制</p><ul style="padding-left:20px;font-size:14px;line-height:1.8;color:#334155;">${facts}</ul>`,
      `</section>`,
    );
    if (index < issue.cards.length - 1) {
      sections.push(
        `<p aria-hidden="true" style="margin:0 0 23px;text-align:center;color:#a9bbcf;font-size:12px;letter-spacing:5px;line-height:1;">· · ·</p>`,
      );
    }
  });

  if (issue.sources.length > 0) {
    const sources = issue.sources
      .map(
        (source, index) =>
          `<li style="margin:0 0 10px;"><a href="${escapeAttribute(source.url)}" style="color:#0f766e;text-decoration:none;">${index + 1}. ${escapeHtml(source.title)}</a><br><span style="font-size:12px;color:#64748b;">${getSourceTypeLabel(source)} · ${escapeHtml(source.publisher)} · ${source.publishedAt ?? "来源页面未标注日期"}</span></li>`,
      )
      .join("");
    sections.push(
      `<section style="margin:0 0 23px;padding:23px 18px;border:1px solid #d8e2ee;border-radius:18px;background:#ffffff;">`,
      heading("原始来源"),
      paragraph("本期按官方资料、独立测评、作者实测自述和社媒原帖线索分别归因；来源编号与正文对应。", "font-size:14px;color:#5d6b82;"),
      `<ol style="padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">${sources}</ol>`,
      `</section>`,
    );
  }

  sections.push(
    `<section style="margin:0 0 23px;padding:21px 18px;border:1px solid #d8e2ee;border-radius:18px;background-color:#f8fafc;">`,
    heading("继续阅读与资料包"),
    paragraph("本期完整来源、限制和可复制、下载的 Markdown 资料包，见本文底部「阅读原文」，进入 AI 前哨站官网。", "font-size:15px;color:#334155;"),
    paragraph("想了解这份周报的生成流程和项目代码，可在官网「关于」页进入 GitHub 项目仓库。", "font-size:13px;color:#64748b;margin-bottom:0;"),
    `</section>`,
    `<p style="margin:30px 0 0;padding:16px;border-radius:10px;background:#edf8f6;font-size:13px;line-height:1.75;color:#315e59;word-break:break-word;">来源事实和编辑判断分开呈现。内容经过 AI 交叉校验和脚本检查；产品信息以官方资料为准，测评只适用于原文所述条件。</p>`,
  );

  return sections.join("\n");
}

export function renderXiaohongshuPost(issue: Issue) {
  return renderXiaohongshuCarousel(issue);
}

export type XiaohongshuBlockStyle = "title" | "heading" | "body" | "muted" | "highlight";

export type XiaohongshuBlock = {
  text: string;
  style: XiaohongshuBlockStyle;
};

export type XiaohongshuCarouselSection = {
  label: string;
  heading: string;
  blocks: XiaohongshuBlock[];
};

export function renderXiaohongshuCarousel(issue: Issue) {
  const sourceById = new Map(issue.sources.map((source) => [source.id, source]));
  const title = issue.hero?.lead ?? issue.title;
  const body = renderXiaohongshuBody(issue);
  const topCards = issue.topChangeIds
    .map((cardId) => issue.cards.find((card) => card.id === cardId))
    .filter((card): card is Issue["cards"][number] => Boolean(card));
  const highlights = topCards.length > 0 ? topCards : issue.cards.slice(0, 3);

  assertXiaohongshuTextLimits(title, body);

  const sections: XiaohongshuCarouselSection[] = [
    {
      label: "本期导读",
      heading: "本期导读",
      blocks: [
        { text: issue.hero?.lead ?? issue.title, style: "title" },
        { text: issue.hero?.deck ?? issue.summary, style: "highlight" },
        { text: issue.summary, style: "body" },
        { text: `本期共 ${issue.cards.length} 条，${issue.period.start} 至 ${issue.period.end}。`, style: "muted" },
        { text: "这周先看", style: "heading" },
        ...highlights.flatMap((card, index) => [
          { text: `${index + 1}. ${card.title}`, style: "heading" as const },
          { text: card.oneLineSummary, style: "body" as const },
        ]),
      ],
    },
    ...issue.cards.map((card, cardIndex) => ({
      label: `情报 ${String(cardIndex + 1).padStart(2, "0")} / ${String(issue.cards.length).padStart(2, "0")}`,
      heading: `情报 ${String(cardIndex + 1).padStart(2, "0")}`,
      blocks: [
        { text: card.title, style: "title" as const },
        { text: `${card.occurredAt.replaceAll("-", ".")} · ${card.publisher} · ${card.category}`, style: "muted" as const },
        { text: "先看结论", style: "heading" as const },
        { text: card.oneLineSummary, style: "highlight" as const },
        { text: "为什么值得关注", style: "heading" as const },
        { text: card.whyItMatters, style: "body" as const },
        { text: "对你的影响与建议", style: "heading" as const },
        { text: card.developerImpact, style: "body" as const },
        { text: `编辑判断：成熟度 ${maturityLabels[card.maturity]}；噪声风险 ${noiseRiskLabels[card.noiseRisk]}；建议 ${actionLabels[card.suggestedAction]}。`, style: "muted" as const },
        { text: "事实、限制与来源", style: "heading" as const },
        ...card.facts.flatMap((fact) => [
          { text: fact.claim, style: "body" as const },
          ...fact.limitations.map((limitation) => ({ text: `限制：${limitation}`, style: "muted" as const })),
          {
            text: `来源：${fact.sourceIds.map((sourceId) => sourceById.get(sourceId)?.publisher ?? sourceId).join("；")}`,
            style: "muted" as const,
          },
        ]),
      ],
    })),
  ];

  if (issue.corrections.length > 0) {
    sections.push({
      label: "更正说明",
      heading: "本期更正记录",
      blocks: issue.corrections.flatMap((correction) => [
        { text: `${correction.correctedAt.slice(0, 10)} · ${correction.description}`, style: "body" as const },
        { text: `涉及情报：${correction.affectedCardIds.join("、") || "未指定"}`, style: "muted" as const },
      ]),
    });
  }

  sections.push({
    label: "原始来源",
    heading: "本期来源索引",
    blocks: issue.sources.flatMap((source, index) => [
      { text: `${index + 1}. ${source.title}`, style: "heading" as const },
      { text: `${getSourceTypeLabel(source)} · ${source.publisher} · ${source.publishedAt ?? "来源页面未标注日期"}`, style: "muted" as const },
      { text: source.url, style: "muted" as const },
    ]),
  });

  sections.push({
    label: "阅读与说明",
    heading: "完整资料在官网",
    blocks: [
      { text: getPublicIssueUrl(issue), style: "highlight" },
      { text: "本期事实、来源、限制和可复制的 Markdown 资料包均可在官网查看。", style: "body" },
      { text: "本文由 AI 辅助整理与排版。官方资料、第三方测评和作者实测自述分别归因；测评只适用于原文所述条件，不能外推为所有任务的结果。", style: "muted" },
    ],
  });

  return { title, body, sections };
}

function renderXiaohongshuBody(issue: Issue) {
  return [
    issue.summary,
    "",
    `本期整理 ${issue.cards.length} 条 AI 更新，完整卡片、事实、限制和来源见轮播图。`,
    `时间范围：${issue.period.start} 至 ${issue.period.end}。`,
    `完整来源和资料包：${getPublicIssueUrl(issue)}`,
    "本文由 AI 辅助整理与排版；第三方测评或作者实测自述不等于本站复现，条件与限制见轮播图和官网。",
    "",
    "#AI资讯 #人工智能 #AI工具 #独立开发",
  ].join("\n");
}

function assertXiaohongshuTextLimits(title: string, body: string) {
  if (Array.from(title).length > 20) {
    throw new Error("小红书标题超过当前 20 字限制，不能静默截断。");
  }
  if (Array.from(body).length > 1000) {
    throw new Error("小红书正文超过当前 1000 字限制，不能静默截断。");
  }
}

function heading(text: string) {
  return `<h2 style="margin:32px 0 14px;font-size:22px;line-height:1.4;color:#101827;">${escapeHtml(text)}</h2>`;
}

function paragraph(text: string, style: string) {
  const safeStyle = /(?:^|;)\s*line-height\s*:/.test(style)
    ? style
    : `${style};line-height:1.75;`;
  return `<p style="${safeStyle}word-break:break-word;">${escapeHtml(text)}</p>`;
}

function renderSourceMarkers(
  sourceIds: string[],
  sourceById: Map<string, EvidenceSource>,
) {
  const links = sourceIds
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source): source is EvidenceSource => Boolean(source))
    .map(
      (source) =>
        `<a href="${escapeAttribute(source.url)}" style="color:#0f766e;text-decoration:none;">来源：${escapeHtml(source.publisher)}</a>`,
    );
  return links.length > 0 ? `（${links.join("；")}）` : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
