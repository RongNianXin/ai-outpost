import { readFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";
import { expect, it } from "vitest";

import type { Issue } from "../lib/content/schema";
import { generateZhihuAssets } from "../lib/publishing/assets";

it("第005期知乎稿包只使用两张已审阅的竖版信息图", async () => {
  const issue = JSON.parse(
    readFileSync(path.join(process.cwd(), "content/issues/issue-005.json"), "utf8"),
  ) as Issue;
  const { cover, images } = await generateZhihuAssets(issue);

  expect(cover).toBeNull();
  expect(images.map((image) => path.basename(image))).toEqual([
    "02-sol-price.jpg",
    "04-acp-flow.jpg",
  ]);
  expect(await Promise.all(images.map(async (image) => {
    const { width, height } = await sharp(image).metadata();
    return [width, height];
  }))).toEqual([[1200, 1080], [1200, 1120]]);
});
