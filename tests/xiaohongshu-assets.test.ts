import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  paginateXiaohongshuSections,
} from "../lib/publishing/assets";
import { renderXiaohongshuCarousel } from "../lib/publishing/derivatives";
import type { Issue } from "../lib/content/schema";

const issue = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "content", "issues", "issue-004.json"),
    "utf8",
  ),
) as Issue;

describe("小红书轮播分页", () => {
  it("对第004期情报03使用安全压缩，避免生成孤页", () => {
    const pages = paginateXiaohongshuSections(
      renderXiaohongshuCarousel(issue).sections,
    );
    const cardThreePages = pages.filter((page) => page.sectionIndex === 3);

    expect(cardThreePages).toHaveLength(1);
    expect(cardThreePages[0].lineScale).toBe(0.9);
  });

  it("无法压缩时，续页至少保留一个可读的信息块", () => {
    const pages = paginateXiaohongshuSections([
      {
        label: "情报 99 / 99",
        heading: "情报 99",
        blocks: [
          { text: "测试标题", style: "title" },
          { text: "先看结论", style: "heading" },
          { text: "内容".repeat(420), style: "body" },
          { text: "事实、限制与来源", style: "heading" },
          { text: "来源与限制".repeat(240), style: "muted" },
        ],
      },
    ]);
    const continuationPages = pages.filter((page) => page.sectionLabel.endsWith(" · 续"));

    expect(continuationPages.length).toBeGreaterThan(0);
    expect(continuationPages.every((page) => page.lines.filter((line) => line.text.trim()).length >= 4)).toBe(true);
  });
});
