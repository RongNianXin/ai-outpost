import { describe, expect, it } from "vitest";
import { getAllIssues, isIssueVisible } from "../lib/content/repository";
import { getInspirationPath, renderInspirationMarkdown } from "../lib/content/inspiration";

describe("inspiration pack", () => {
  it("supports local and GitHub Pages base paths", () => {
    expect(getInspirationPath("issue-003")).toBe("/issues/issue-003/brief.md");
    expect(getInspirationPath("issue-003", "/ai-outpost/")).toBe("/ai-outpost/issues/issue-003/brief.md");
  });
  it("retains every fact, limitation and source without exporting internal notes", async () => {
    for (const issue of await getAllIssues()) {
      const markdown = renderInspirationMarkdown(issue);
      expect(markdown).toContain(issue.title);
      for (const card of issue.cards) for (const fact of card.facts) {
        expect(markdown).toContain(fact.claim);
        for (const limit of fact.limitations) expect(markdown).toContain(limit);
      }
      for (const source of issue.sources) expect(markdown).toContain(source.url);
      expect(markdown).not.toContain("127.0.0.1");
      expect(markdown).not.toContain("C:\\");
      if (issue.editorial.notes) expect(markdown).not.toContain(issue.editorial.notes);
      expect(renderInspirationMarkdown(issue)).toBe(markdown);
    }
  });
  it("labels unpublished packs and excludes them from production visibility", async () => {
    const issue = (await getAllIssues())[0];
    issue.status = "approved";
    expect(renderInspirationMarkdown(issue)).toContain("本地审核稿，尚未公开");
    expect(isIssueVisible(issue.status, "production")).toBe(false);
    expect(isIssueVisible(issue.status, "development")).toBe(true);
  });
});
