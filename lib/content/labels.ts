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
  try: "重点阅读",
};

export const strategyLabels: Record<IntelCard["suggestedAction"], string> = {
  ignore: "暂不处理",
  save: "持续观察",
  learn: "先学习",
  try: "重点阅读",
};

export const strategyDescriptions: Record<IntelCard["suggestedAction"], string> = {
  ignore: "这条暂时不用投入时间，知道有这件事即可。",
  save: "先收藏或记录，后续变化明确时再判断重要性。",
  learn: "先读懂概念和官方说明，暂时不要求动手实现。",
  try: "这条对开发者影响较直接，建议优先读完事实和限制条件。",
};

export const technicalRiskLabels: Record<IntelCard["reviewRisk"], string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const issueStatusLabels: Record<Issue["status"], string> = {
  draft: "待验证",
  approved: "AI 已验证",
  published: "已发布",
  corrected: "已更正",
};
