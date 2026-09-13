import type { Issue } from "./schema";

export const latestNoticeStart = "<!-- AI_OUTPOST_LATEST_START -->";
export const latestNoticeEnd = "<!-- AI_OUTPOST_LATEST_END -->";

export function renderLatestReadmeNotice(issue: Issue) {
  const lead = normalizeInline(issue.hero?.lead ?? issue.title);
  const summary = normalizeInline(issue.summary);
  const issueNumber = String(issue.issueNumber).padStart(3, "0");
  const publicUrl = `https://rongnianxin.github.io/ai-outpost/issues/${issue.slug}/`;

  return [
    latestNoticeStart,
    "## 最新一期",
    "",
    `**AI 前哨站第 ${issueNumber} 期**：${lead}`,
    "",
    summary,
    "",
    `[阅读本期官网](${publicUrl})`,
    latestNoticeEnd,
  ].join("\n");
}

export function replaceLatestReadmeNotice(readme: string, notice: string) {
  const startIndex = readme.indexOf(latestNoticeStart);
  const endIndex = readme.indexOf(latestNoticeEnd);

  if ((startIndex >= 0) !== (endIndex >= 0) || (startIndex >= 0 && endIndex < startIndex)) {
    throw new Error("README 最新一期提示区块标记不完整或顺序错误。");
  }

  const normalizedNotice = notice.trim();
  if (!normalizedNotice.startsWith(latestNoticeStart) || !normalizedNotice.endsWith(latestNoticeEnd)) {
    throw new Error("新的 README 提示必须包含完整的区块标记。");
  }

  if (startIndex >= 0) {
    const endExclusive = endIndex + latestNoticeEnd.length;
    return `${readme.slice(0, startIndex)}${normalizedNotice}${readme.slice(endExclusive)}`;
  }

  const anchor = "\n\n现行发布平台";
  const anchorIndex = readme.indexOf(anchor);
  if (anchorIndex < 0) {
    throw new Error("README 缺少可安全插入最新一期提示的锚点，拒绝追加到未知位置。");
  }

  return `${readme.slice(0, anchorIndex)}\n\n${normalizedNotice}${readme.slice(anchorIndex)}`;
}

function normalizeInline(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
