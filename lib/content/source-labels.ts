import type { EvidenceSource } from "./schema";

export function getSourceTypeLabel(source: EvidenceSource) {
  if (source.sourceType === "independent_review") return "独立测评";
  if (source.sourceType === "creator_review") return "博主实测自述";
  return "官方来源";
}
