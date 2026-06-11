import type { IntelCard, Issue } from "./schema";

export const maturityLabels: Record<IntelCard["maturity"], string> = {
  experimental: "实验",
  usable: "可用",
  worth_investing: "值得投入",
};

export const noiseRiskLabels: Record<IntelCard["noiseRisk"], string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const actionLabels: Record<IntelCard["suggestedAction"], string> = {
  ignore: "忽略",
  save: "收藏",
  learn: "学习",
  try: "动手验证",
};

export const issueStatusLabels: Record<Issue["status"], string> = {
  draft: "草稿",
  approved: "已批准",
  published: "已发布",
  corrected: "已更正",
};
