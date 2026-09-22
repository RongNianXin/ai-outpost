import {
  actionLabels,
  maturityLabels,
  noiseRiskLabels,
} from "./labels";
import type { EvidenceSource, Issue } from "./schema";
import { getSourceTypeLabel } from "./source-labels";

const SITE_ORIGIN = "https://rongnianxin.github.io/ai-outpost";

export function renderZhihuMarkdown(issue: Issue): string {
  const sourceById = new Map(issue.sources.map((source) => [source.id, source]));
  const lines: string[] = [
    `# ${issue.title}${issue.hero?.lead ? `｜${issue.hero.lead}` : ""}`,
    "",
    `**先说结论：** ${issue.summary}`,
    "",
    `这不是一份“新功能清单”。本期更关心一个问题：当 AI 的能力边界不断扩大时，我们怎样判断它适合做什么、谁能用、谁来监督，以及怎样验收结果？以下内容以同一期事实稿为基础，区分公开事实、编辑判断和仍待验证的限制。`,
    "",
    `> 覆盖时间：${issue.period.start} 至 ${issue.period.end}`,
    "",
    "## 先把问题拆开",
    "",
    "面对一条 AI 更新，至少要分开看四件事：",
    "",
    "1. 它到底发布了什么，证据来自哪里？",
    "2. 谁能使用，开放范围和阶段是什么？",
    "3. 哪些结果仍需要人检查，失败时如何接管？",
    "4. 这条消息是行业统计、机构自述，还是一次受条件限制的测评？",
    "",
  ];

  issue.cards.forEach((card, index) => {
    lines.push(
      `## ${index + 1}. ${card.title}`,
      "",
      `**发生了什么？** ${card.oneLineSummary}`,
      "",
      `**为什么值得看？** ${card.whyItMatters}`,
      "",
      `**我的判断：** ${card.developerImpact}`,
      "",
      `- 成熟度：${maturityLabels[card.maturity]}`,
      `- 营销噪声风险：${noiseRiskLabels[card.noiseRisk]}`,
      `- 建议动作：${actionLabels[card.suggestedAction]}`,
      "",
      "**事实与限制：**",
      "",
    );
    card.facts.forEach((fact) => {
      lines.push(`- ${fact.claim}${renderSourceMarkers(fact.sourceIds, sourceById)}`);
      fact.limitations.forEach((limitation) => lines.push(`  - 限制：${limitation}`));
    });
    lines.push("");
  });

  if (issue.practiceTask) {
    lines.push(
      "## 如果你准备试用，先做这张边界清单",
      "",
      `**目标：** ${issue.practiceTask.objective}`,
      "",
      ...issue.practiceTask.steps.map((step, index) => `${index + 1}. ${step}`),
      "",
    );
  }

  if (issue.glossary.length > 0) {
    lines.push("## 术语解释", "", ...issue.glossary.map((entry) => `- **${entry.term}**：${entry.explanation}`), "");
  }

  lines.push("## 来源与继续阅读", "");
  issue.sources.forEach((source, index) => {
    lines.push(`${index + 1}. [${source.title}](${source.url})，${getSourceTypeLabel(source)}，${source.publishedAt ?? "来源页面未标注发布日期"}`);
  });
  lines.push(
    "",
    `本期官网详情页和可下载资料包：[AI 前哨站第 ${String(issue.issueNumber).padStart(3, "0")} 期](${SITE_ORIGIN}/issues/${issue.slug}/)。`,
    "",
    "本文使用 AI 辅助检索、整理和审校；作者负责选题、编辑判断和最终发布决定。事实以所列来源为准，测评或机构自述不外推为普遍结论。",
    "",
  );
  return lines.join("\n");
}

function renderSourceMarkers(sourceIds: string[], sourceById: Map<string, EvidenceSource>) {
  const markers = sourceIds
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source): source is EvidenceSource => Boolean(source))
    .map((source) => `[来源：${source.publisher}](${source.url})`);
  return markers.length > 0 ? `（${markers.join("；")}）` : "";
}
