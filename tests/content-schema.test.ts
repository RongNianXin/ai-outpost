import { describe, expect, it } from "vitest";

import { issueSchema } from "../lib/content/schema";
import { isIssueVisible } from "../lib/content/repository";
import { sourceCatalogSchema } from "../lib/content/source-catalog";
import { validateContentCollection } from "../lib/content/validation";
import { renderWechatMarkdown } from "../lib/content/wechat";

const baseIssue = {
  schemaVersion: 1 as const,
  id: "issue-001",
  slug: "issue-001",
  issueNumber: 1,
  title: "AI 前哨站测试期",
  summary: "这是一份用于自动测试的已批准情报周报。",
  period: {
    start: "2026-06-01",
    end: "2026-06-07",
  },
  status: "published" as const,
  publishedAt: "2026-06-08T08:00:00.000Z",
  topChangeIds: ["card-001"],
  opportunities: [
    {
      id: "opportunity-001",
      title: "构建一个小型验证工具",
      rationale: "用很小的投入验证这项变化是否能改善现有工作流。",
      plainLanguage: "对你来说，它更像一个可以快速完成的小练习。",
      relatedCardIds: ["card-001"],
      confidence: "medium" as const,
    },
  ],
  practiceTask: {
    title: "完成一次小型功能验证",
    durationMinutes: 45,
    objective: "通过一个可重复的小实验确认官方功能是否符合预期。",
    steps: ["阅读官方文档中的限制条件。", "制作最小示例并记录结果。"],
    relatedCardIds: ["card-001"],
  },
  cards: [
    {
      id: "card-001",
      title: "测试功能正式发布",
      category: "编程工具",
      publisher: "Example",
      occurredAt: "2026-06-03",
      discoveredAt: "2026-06-04",
      oneLineSummary: "官方发布了一项用于验证内容模型的测试功能。",
      whyItMatters: "它可以验证情报卡是否完整保留事实与分析边界。",
      developerImpact: "开发者可以用它检查内容转换过程中是否丢失硬事实。",
      maturity: "usable" as const,
      noiseRisk: "low" as const,
      suggestedAction: "try" as const,
      reviewRisk: "low" as const,
      reviewStatus: "ai_cross_checked" as const,
      communicationAngle: "一份事实源可以稳定生成多个渠道版本。",
      visualHint: "使用结构化内容流程图。",
      facts: [
        {
          id: "fact-001",
          claim: "官方在 2026 年 6 月 3 日发布了这项测试功能。",
          sourceIds: ["source-001"],
          limitations: ["此事实仅用于自动测试，不会公开发布。"],
          reviewStatus: "ai_cross_checked" as const,
        },
      ],
      tags: ["测试", "内容模型"],
    },
  ],
  sources: [
    {
      id: "source-001",
      catalogId: "official-source",
      title: "Example official announcement",
      url: "https://example.com/official-announcement",
      sourceType: "official_announcement" as const,
      publisher: "Example",
      publishedAt: "2026-06-03",
      accessedAt: "2026-06-08T07:00:00.000Z",
      evidenceLocation: "Announcement introduction",
      evidenceExcerpt: "This short excerpt exists only for automated testing.",
    },
  ],
  corrections: [],
  editorial: {
    generatedAt: "2026-06-08T07:00:00.000Z",
    aiReviewCompleted: true,
    factCheckCompletedAt: "2026-06-08T07:30:00.000Z",
    previewApprovedAt: "2026-06-08T07:45:00.000Z",
    publicationApprovedAt: "2026-06-08T08:00:00.000Z",
    notes: "Automated test fixture.",
  },
};

describe("issueSchema", () => {
  it("accepts a complete approved issue", () => {
    expect(issueSchema.parse(baseIssue).slug).toBe("issue-001");
  });

  it("allows approved content without a publication date", () => {
    expect(
      issueSchema.parse({
        ...baseIssue,
        status: "approved",
        publishedAt: null,
      }).status,
    ).toBe("approved");
  });

  it("allows public issues without a separate human publication approval", () => {
    expect(
      issueSchema.parse({
        ...baseIssue,
        editorial: {
          ...baseIssue.editorial,
          publicationApprovedAt: null,
        },
      }).status,
    ).toBe("published");
  });

  it("requires a publication date for public issues", () => {
    expect(() =>
      issueSchema.parse({
        ...baseIssue,
        publishedAt: null,
      }),
    ).toThrow(/publication date/i);
  });

  it("rejects an invalid enum value", () => {
    expect(() =>
      issueSchema.parse({
        ...baseIssue,
        cards: [{ ...baseIssue.cards[0], maturity: "finished" }],
      }),
    ).toThrow();
  });

  it("rejects duplicate card ids", () => {
    expect(() =>
      issueSchema.parse({
        ...baseIssue,
        cards: [baseIssue.cards[0], baseIssue.cards[0]],
      }),
    ).toThrow(/Duplicate card id/);
  });

  it("rejects duplicate practice steps", () => {
    expect(() =>
      issueSchema.parse({
        ...baseIssue,
        practiceTask: {
          ...baseIssue.practiceTask,
          steps: [
            baseIssue.practiceTask.steps[0],
            baseIssue.practiceTask.steps[0],
          ],
        },
      }),
    ).toThrow(/Duplicate practice step/);
  });

  it("rejects dangling source references", () => {
    expect(() =>
      issueSchema.parse({
        ...baseIssue,
        cards: [
          {
            ...baseIssue.cards[0],
            facts: [
              {
                ...baseIssue.cards[0].facts[0],
                sourceIds: ["missing-source"],
              },
            ],
          },
        ],
      }),
    ).toThrow(/Unknown source reference/);
  });

  it("requires AI cross-checking for public issues", () => {
    expect(() =>
      issueSchema.parse({
        ...baseIssue,
        cards: [
          {
            ...baseIssue.cards[0],
            reviewStatus: "ai_checked",
          },
        ],
      }),
    ).toThrow(/cross-checked/);
  });
});

describe("renderWechatMarkdown", () => {
  it("preserves titles, dates, facts and sources", () => {
    const issue = issueSchema.parse(baseIssue);
    const markdown = renderWechatMarkdown(issue);

    expect(markdown).toContain(issue.title);
    expect(markdown).toContain(issue.period.start);
    expect(markdown).toContain(issue.cards[0].facts[0].claim);
    expect(markdown).toContain(issue.opportunities[0].plainLanguage);
    expect(markdown).toContain(issue.sources[0].url);
  });

  it("labels official documentation without a publication date", () => {
    const issue = issueSchema.parse({
      ...baseIssue,
      sources: [{ ...baseIssue.sources[0], publishedAt: null }],
    });
    const markdown = renderWechatMarkdown(issue);

    expect(markdown).toContain("官方页面未标注发布日期");
  });
});

describe("sourceCatalogSchema", () => {
  it("rejects duplicate catalog ids", () => {
    const source = {
      id: "official-source",
      name: "Official Source",
      homepage: "https://example.com/",
      officialUrls: ["https://example.com/news"],
      topics: ["models"],
    };

    expect(() => sourceCatalogSchema.parse([source, source])).toThrow(
      /Duplicate source catalog id/,
    );
  });
});

describe("validateContentCollection", () => {
  const catalog = sourceCatalogSchema.parse([
    {
      id: "official-source",
      name: "Official Source",
      homepage: "https://example.com/",
      officialUrls: ["https://example.com/official/"],
      topics: ["models"],
    },
  ]);

  it("rejects duplicate issue slugs across files", () => {
    const issue = issueSchema.parse(baseIssue);
    const errors = validateContentCollection(
      [
        { fileName: "first.json", issue },
        {
          fileName: "second.json",
          issue: {
            ...issue,
            id: "issue-002",
            issueNumber: 2,
          },
        },
      ],
      catalog,
    );

    expect(
      errors.some((error) => error.message.includes("Duplicate issue slug")),
    ).toBe(true);
  });

  it("rejects evidence URLs outside the official allowlist", () => {
    const issue = issueSchema.parse(baseIssue);
    const errors = validateContentCollection(
      [{ fileName: "issue.json", issue }],
      catalog,
    );

    expect(errors.some((error) => error.message.includes("outside"))).toBe(true);
  });

  it("rejects vague action phrases in free text fields", () => {
    const issue = issueSchema.parse({
      ...baseIssue,
      cards: [
        {
          ...baseIssue.cards[0],
          oneLineSummary: "这项变化值得保持关注，后续再根据实际情况决定。",
        },
      ],
    });
    const errors = validateContentCollection(
      [{ fileName: "issue.json", issue }],
      sourceCatalogSchema.parse([
        {
          id: "official-source",
          name: "Official Source",
          homepage: "https://example.com/",
          officialUrls: ["https://example.com/"],
          topics: ["models"],
        },
      ]),
    );

    expect(
      errors.some((error) => error.message.includes("Vague action phrase")),
    ).toBe(true);
  });
});

describe("issue visibility", () => {
  it("shows approved issues only in development previews", () => {
    expect(isIssueVisible("approved", "development")).toBe(true);
    expect(isIssueVisible("approved", "production")).toBe(false);
  });

  it("shows published issues in development and production", () => {
    expect(isIssueVisible("published", "development")).toBe(true);
    expect(isIssueVisible("published", "production")).toBe(true);
  });
});
