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
  const sections: string[] = [
    paragraph(issue.summary, "font-size:17px;line-height:1.85;color:#1f2937;margin:0 0 18px;"),
    paragraph(
      `覆盖时间：${issue.period.start} 至 ${issue.period.end}`,
      "font-size:13px;line-height:1.7;color:#64748b;margin:0 0 28px;",
    ),
  ];

  if (issue.topChangeIds.length > 0) {
    const items = issue.topChangeIds
      .map((cardId) => issue.cards.find((card) => card.id === cardId))
      .filter((card): card is Issue["cards"][number] => Boolean(card))
      .map(
        (card, index) =>
          `<p style="margin:0 0 12px;font-size:16px;line-height:1.8;color:#182235;"><strong style="color:#0f766e;">${index + 1}</strong>　<strong>${escapeHtml(card.title)}</strong><br><span style="color:#475569;">${escapeHtml(card.oneLineSummary)}</span></p>`,
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
      `<section style="margin:34px 0 0;padding-top:22px;border-top:1px solid #dce3e8;">`,
      `<p style="margin:0 0 8px;font-size:12px;letter-spacing:1.5px;color:#0f766e;font-weight:700;">情报 ${String(index + 1).padStart(2, "0")} · ${escapeHtml(card.category)}</p>`,
      `<h2 style="margin:0 0 14px;font-size:23px;line-height:1.4;color:#101827;">${escapeHtml(card.title)}</h2>`,
      labelParagraph("发生了什么", card.oneLineSummary),
      labelParagraph("为什么值得关注", card.whyItMatters),
      labelParagraph("对你的影响", card.developerImpact),
      `<p style="margin:14px 0;font-size:14px;line-height:1.8;color:#475569;">成熟度：${maturityLabels[card.maturity]}　·　噪声风险：${noiseRiskLabels[card.noiseRisk]}　·　建议：${actionLabels[card.suggestedAction]}</p>`,
      `<p style="margin:16px 0 6px;font-size:14px;color:#0f766e;font-weight:700;">事实、测评与限制</p><ul style="padding-left:20px;font-size:14px;line-height:1.8;color:#334155;">${facts}</ul>`,
      `</section>`,
    );
  });

  if (issue.sources.length > 0) {
    const sources = issue.sources
      .map(
        (source, index) =>
          `<li style="margin:0 0 10px;"><a href="${escapeAttribute(source.url)}" style="color:#0f766e;text-decoration:none;">${index + 1}. ${escapeHtml(source.title)}</a><br><span style="font-size:12px;color:#64748b;">${getSourceTypeLabel(source)} · ${escapeHtml(source.publisher)} · ${source.publishedAt ?? "来源页面未标注日期"}</span></li>`,
      )
      .join("");
    sections.push(
      heading("原始来源"),
      `<ol style="padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">${sources}</ol>`,
    );
  }

  sections.push(
    `<p style="margin:30px 0 0;padding:16px;border-radius:10px;background:#edf8f6;font-size:13px;line-height:1.75;color:#315e59;">来源事实和编辑判断分开呈现。内容经过 AI 交叉校验和脚本检查；产品信息以官方资料为准，测评只适用于原文所述条件。</p>`,
  );

  return sections.join("\n");
}

export function renderXiaohongshuPost(issue: Issue) {
  const titleSeed = issue.hero?.lead ?? issue.title;
  const title = truncate(titleSeed, 19);
  const topCards = issue.topChangeIds
    .map((cardId) => issue.cards.find((card) => card.id === cardId))
    .filter((card): card is Issue["cards"][number] => Boolean(card));
  const selected = topCards.length > 0 ? topCards : issue.cards.slice(0, 3);
  const body: string[] = [
    "这周的 AI 更新很多，但真正会改变你工作方式的，主要是下面几件。",
    "",
  ];

  selected.forEach((card, index) => {
    body.push(
      `${index + 1}. ${card.title}`,
      card.oneLineSummary,
      `给你的建议：${actionLabels[card.suggestedAction]}。${card.developerImpact}`,
      "",
    );
  });

  body.push(
    `本期共整理 ${issue.cards.length} 条，时间范围 ${issue.period.start} 至 ${issue.period.end}。`,
    `完整事实、测评条件和原始来源：${getPublicIssueUrl(issue)}`,
    "",
    "#AI资讯 #人工智能 #AI工具 #独立开发",
  );

  if (selected.some((card) => card.facts.some((fact) =>
    fact.sourceIds.some((id) => issue.sources.some((source) =>
      source.id === id && ["independent_review", "creator_review"].includes(source.sourceType)))))) {
    body.push("测评为第三方报告或作者实测自述，不等于本站复现；配置、日期与限制见完整来源，不能外推为所有任务的表现。");
  }

  return { title, body: body.join("\n") };
}

function heading(text: string) {
  return `<h2 style="margin:32px 0 14px;font-size:22px;line-height:1.4;color:#101827;">${escapeHtml(text)}</h2>`;
}

function labelParagraph(label: string, value: string) {
  return `<p style="margin:10px 0;font-size:15px;line-height:1.85;color:#334155;"><strong style="color:#101827;">${escapeHtml(label)}：</strong>${escapeHtml(value)}</p>`;
}

function paragraph(text: string, style: string) {
  return `<p style="${style}">${escapeHtml(text)}</p>`;
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

function truncate(value: string, maxLength: number) {
  const units = Array.from(value.trim());
  return units.length <= maxLength
    ? units.join("")
    : `${units.slice(0, maxLength - 1).join("")}…`;
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
