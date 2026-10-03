import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  coverTitleLines,
  paginateXiaohongshuSections,
  wrapTextFully,
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
  it("第005期封面标题按语义断行且笔记标题不沿用旧导语", () => {
    const current = JSON.parse(readFileSync(path.join(process.cwd(), "content/issues/issue-005.json"), "utf8")) as Issue;
    expect(coverTitleLines(current.hero!.coverTitle!, 13, 3)).toEqual([
      "从模型发布到工程工具：",
      "先确认谁能用，",
      "再判断能否交给它做",
    ]);
    expect(renderXiaohongshuCarousel(current).title).toBe(current.title);
  });

  it("正文卡沿用共同栏目而不展示内部评级", () => {
    const current = JSON.parse(readFileSync(path.join(process.cwd(), "content/issues/issue-005.json"), "utf8")) as Issue;
    const blocks = renderXiaohongshuCarousel(current).sections.flatMap((section) => section.blocks.map((block) => block.text));
    for (const label of ["内容详情", "造成的影响", "行动参考", "事实、测评与限制"]) {
      expect(blocks).toContain(label);
    }
    expect(blocks.join("\n")).not.toMatch(/成熟度|营销噪声风险|建议动作|编辑判断/);
  });

  it("续页前不留下孤立栏目标题", () => {
    const current = JSON.parse(readFileSync(path.join(process.cwd(), "content/issues/issue-005.json"), "utf8")) as Issue;
    const pages = paginateXiaohongshuSections(renderXiaohongshuCarousel(current).sections);
    for (const page of pages) {
      expect(page.lines.findLast((line) => line.text.trim())?.style).not.toBe("heading");
    }
  });

  it("英文产品名和协议名在行宽允许时保持完整", () => {
    const lines = wrapTextFully(
      "OpenAI 发布 GPT-6 Sol，并通过 Chat Completions API 调用。",
      12,
    );

    expect(lines.some((line) => line.includes("GPT-6"))).toBe(true);
    expect(lines.some((line) => line.includes("Chat"))).toBe(true);
    expect(lines.join("\n")).not.toMatch(/GPT\n-6|Complet\nions/);
  });

  it("第004期情报03删去内部评级后无需压缩且没有孤页", () => {
    const pages = paginateXiaohongshuSections(
      renderXiaohongshuCarousel(issue).sections,
    );
    const cardThreePages = pages.filter((page) => page.sectionIndex === 3);

    expect(cardThreePages).toHaveLength(1);
    expect(cardThreePages[0].lineScale).toBeUndefined();
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
