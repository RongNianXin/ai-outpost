import {
  actionLabels,
  maturityLabels,
  noiseRiskLabels,
  opportunityLevelDescriptions,
  opportunityLevelLabels,
} from "./labels";
import type { EvidenceSource, Issue } from "./schema";

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
      `**建议行动：** ${actionLabels[card.suggestedAction]}`,
      "",
      "**AI 交叉核查事实：**",
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

  if (issue.opportunities.length > 0) {
    lines.push("## 可以尝试的小项目", "");
    issue.opportunities.forEach((opportunity) => {
      lines.push(
        `### ${opportunity.title}`,
        "",
        `**行动级别：** ${opportunityLevelLabels[opportunity.confidence]}。${opportunityLevelDescriptions[opportunity.confidence]}`,
        "",
        `**新手解释：** ${opportunity.plainLanguage}`,
        "",
        opportunity.rationale,
        "",
      );
    });
  }

  lines.push(
    "## 本期实践任务",
    "",
    `**${issue.practiceTask.title}（约 ${issue.practiceTask.durationMinutes} 分钟）**`,
    "",
    issue.practiceTask.objective,
    "",
  );
  issue.practiceTask.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });
  lines.push("");

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
      const sourceDate = source.publishedAt ?? "官方页面未标注发布日期";
      lines.push(`${index + 1}. [${source.title}](${source.url})，${sourceDate}`);
    });
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "来源事实、AI 分析和行动建议已按单列文本流整理。内容经过 AI 交叉校验和脚本检查；重要信息请以官方来源为准。",
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
