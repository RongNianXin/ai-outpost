import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, it } from "vitest";

import type { Issue } from "../lib/content/schema";
import { generateZhihuAssets } from "../lib/publishing/assets";

it("知乎标准稿包不再生成情报卡或默认插图", async () => {
  const issue = JSON.parse(
    readFileSync(path.join(process.cwd(), "content/issues/issue-005.json"), "utf8"),
  ) as Issue;
  const { cover, illustrations } = await generateZhihuAssets(issue);

  expect(cover).toBeNull();
  expect(illustrations).toEqual([]);
});
