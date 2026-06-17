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

export const strategyLabels: Record<IntelCard["suggestedAction"], string> = {
  ignore: "暂不处理",
  save: "持续关注",
  learn: "先学习",
  try: "动手试一下",
};

export const strategyDescriptions: Record<IntelCard["suggestedAction"], string> = {
  ignore: "这条暂时不用投入时间，知道有这件事即可。",
  save: "先收藏或记录，后续变化明确时再决定是否投入。",
  learn: "先读懂概念和官方说明，暂时不要求动手实现。",
  try: "适合用一个小实验验证，不需要立刻做成产品。",
};

export const technicalRiskLabels: Record<IntelCard["reviewRisk"], string> = {
  low: "低",
  medium: "中",
  high: "高",
};

type OpportunityConfidence = Issue["opportunities"][number]["confidence"];

export const opportunityLevelLabels: Record<OpportunityConfidence, string> = {
  low: "先记下",
  medium: "小步试做",
  high: "优先验证",
};

export const opportunityLevelDescriptions: Record<OpportunityConfidence, string> = {
  low: "想法还早，先放进个人灵感清单。",
  medium: "可以用 30 到 120 分钟做个小样。",
  high: "和当前实践强相关，优先做一次验证。",
};

export const issueStatusLabels: Record<Issue["status"], string> = {
  draft: "待验证",
  approved: "AI 已验证",
  published: "已发布",
  corrected: "已更正",
};
