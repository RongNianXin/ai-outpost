import type { Issue } from "./schema";

export function getTopCards(issue: Issue) {
  return issue.topChangeIds.flatMap((cardId) => {
    const card = issue.cards.find((item) => item.id === cardId);
    return card ? [card] : [];
  });
}

export function getFastTakeaway(issue: Issue) {
  return issue.summary.split("对开发者来说，").at(1) ?? issue.summary;
}

export function getIssueThemeLabels(issue: Issue) {
  const categories = Array.from(new Set(issue.cards.map((card) => card.category)));
  const labels: string[] = ["官方来源"];

  if (categories.some((category) => category.includes("安全"))) {
    labels.push("审核安全");
  }

  if (categories.some((category) => category.includes("Agent"))) {
    labels.push("Agent 基建");
  }

  if (categories.some((category) => category.includes("成本"))) {
    labels.push("成本计量");
  }

  if (categories.some((category) => category.includes("模型"))) {
    labels.push("模型迁移");
  }

  if (categories.some((category) => category.includes("多模态"))) {
    labels.push("多模态");
  }

  return labels.length > 1 ? labels.slice(0, 4) : categories.slice(0, 4);
}

export function getWeeklyImpactBullets(issue: Issue) {
  const searchableText = issue.cards
    .flatMap((card) => [card.title, card.category, card.publisher, ...card.tags])
    .join(" ");
  const bullets: string[] = [];

  if (
    searchableText.includes("Agent") ||
    searchableText.includes("工作流") ||
    searchableText.includes("SDK")
  ) {
    bullets.push("Agent 不再只是聊天窗口，正在进入 CI、审核、工具权限等工程流程。");
  }

  if (searchableText.includes("模型") || searchableText.includes("退役")) {
    bullets.push("模型更新会影响成本、稳定性和迁移期限，不能只看新模型是否更强。");
  }

  if (searchableText.includes("多模态") || searchableText.includes("Web Search")) {
    bullets.push("搜索和多模态能力开始进入产品链路，但来源、版权和展示规则也更重要。");
  }

  if (searchableText.includes("审核") || searchableText.includes("Bugbot")) {
    bullets.push("AI 写代码越快，提交前检查和安全闸门越应该前移。");
  }

  return bullets.slice(0, 4);
}

export function toChineseCount(count: number) {
  const labels: Record<number, string> = {
    1: "一",
    2: "两",
    3: "三",
    4: "四",
    5: "五",
    6: "六",
  };

  return labels[count] ?? String(count);
}
