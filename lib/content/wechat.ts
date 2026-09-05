import {
  actionLabels,
  maturityLabels,
  noiseRiskLabels,
} from "./labels";
import type { EvidenceSource, Issue } from "./schema";
import { getSourceTypeLabel } from "./source-labels";

export function renderWechatMarkdown(issue: Issue): string {
  const sourceById = new Map(
    issue.sources.map((source) => [source.id, source]),
  );
  const lines: string[] = [
    `# ${issue.title}`,
    "",
    issue.summary,
    "",
    `> 覆盖时间：${issue.period.start} 至 ${issue.period.end}`,
    "",
  ];

  if (issue.topChangeIds.length > 0) {
    lines.push("## 本期最重要的变化", "");
    issue.topChangeIds.forEach((cardId, index) => {
      const card = issue.cards.find((item) => item.id === cardId);
      if (card) {
        lines.push(`${index + 1}. **${card.title}**：${card.oneLineSummary}`);
      }
    });
    lines.push("");
  }

  issue.cards.forEach((card, index) => {
    lines.push(
      `## ${index + 1}. ${card.title}`,
      "",
      `**发生了什么：** ${card.oneLineSummary}`,
      "",
      `**为什么值得关注：** ${card.whyItMatters}`,
      "",
      `**对 AI 应用开发者的影响：** ${card.developerImpact}`,
      "",
      `**成熟度：** ${maturityLabels[card.maturity]}`,
      "",
      `**营销噪声风险：** ${noiseRiskLabels[card.noiseRisk]}`,
      "",
      `**建议处理：** ${actionLabels[card.suggestedAction]}`,
      "",
      "**事实、测评与限制：**",
      "",
    );

    card.facts.forEach((fact) => {
      lines.push(`- ${fact.claim}${renderSourceMarkers(fact.sourceIds, sourceById)}`);
      fact.limitations.forEach((limitation) => {
        lines.push(`  - 限制：${limitation}`);
      });
    });
    lines.push("");
  });

  if (issue.glossary.length > 0) {
    lines.push("## 术语解释", "");
    issue.glossary.forEach((entry) => {
      lines.push(`- **${entry.term}**：${entry.explanation}`);
    });
    lines.push("");
  }

  if (issue.sources.length > 0) {
    lines.push("## 原始来源", "");
    issue.sources.forEach((source, index) => {
      const sourceDate = source.publishedAt ?? "来源页面未标注发布日期";
      lines.push(`${index + 1}. [${source.title}](${source.url})，${getSourceTypeLabel(source)}，${sourceDate}`);
    });
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "来源事实和 AI 分析已按单列文本流整理。内容经过 AI 交叉校验和脚本检查；产品信息以官方资料为准，测评结论只适用于原文所述条件。",
    "",
  );

  return lines.join("\n");
}

function renderSourceMarkers(
  sourceIds: string[],
  sourceById: Map<string, EvidenceSource>,
) {
  const markers = sourceIds
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source): source is EvidenceSource => Boolean(source))
    .map((source) => `[来源：${source.publisher}](${source.url})`);

  return markers.length > 0 ? `（${markers.join("；")}）` : "";
}
