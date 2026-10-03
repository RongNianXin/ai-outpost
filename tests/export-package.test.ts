import { test, expect } from "vitest";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exportFilesToDirectory } from "../lib/publishing/export-package";

test("uses a readable issue-and-platform folder prefix for every media package", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "outpost-package-test-"));
  const sources = [
    { path: path.join(root, "post.txt"), name: "post.txt" },
    { path: path.join(root, "manifest.json"), name: "manifest.json" },
  ];
  await writeFile(sources[0].path, "小红书正文");
  await writeFile(sources[1].path, "{}\n");

  const xhs = await exportFilesToDirectory(root, sources, 6, "xiaohongshu");
  const wechat = await exportFilesToDirectory(root, sources, 6, "wechat");
  const zhihu = await exportFilesToDirectory(root, sources, 6, "zhihu");

  expect(path.basename(xhs.directory)).toMatch(/^AI-Outpost-006-Xiaohongshu-/);
  expect(path.basename(wechat.directory)).toMatch(/^AI-Outpost-006-WeChat-/);
  expect(path.basename(zhihu.directory)).toMatch(/^AI-Outpost-006-Zhihu-/);
  expect(await readdir(xhs.directory)).toEqual(["manifest.json", "post.txt"]);
  expect(await readFile(path.join(xhs.directory, "post.txt"), "utf8")).toBe("小红书正文");
});
