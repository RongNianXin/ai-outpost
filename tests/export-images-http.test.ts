import { test, expect } from "vitest";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

test.skipIf(!process.env.OUTPOST_HTTP_TEST)("real preview images and protected directory export", async () => {
  const base = "http://127.0.0.1:3101";
  const slug = "2026-09-19-frontier-ai-governance-and-agents";
  const html = await (await fetch(base + "/preview/xiaohongshu?slug=" + slug)).text();
  const token = html.match(/data-token="([^"]+)"/)?.[1];
  expect(token).toBeTruthy();
  expect(html).toContain('class="package-export"');
  const directory = await mkdtemp(path.join(os.tmpdir(), "outpost-http-"));
  const body = JSON.stringify({ slug, directory });
  const headers = { "Content-Type": "application/json", Origin: base, "x-outpost-token": token! };
  const denied = await fetch(base + "/api/export-images", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body });
  expect(denied.status).toBe(403);
  const wrongOrigin = await fetch(base + "/api/export-images", { method: "POST", headers: { ...headers, Origin: "https://example.com" }, body });
  expect(wrongOrigin.status).toBe(403);
  expect(await readdir(directory)).toEqual([]);
  const response = await fetch(base + "/api/export-images", { method: "POST", headers, body });
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.count).toBeGreaterThan(0);
  expect(result.count).toBe(result.names.length);
  expect(await readdir(result.directory)).toEqual(result.names);
  await Promise.all(result.names.map(async (name: string, index: number) => {
    const image = await fetch(base + "/preview/xhs-image?slug=" + slug + "&index=" + index);
    expect(image.status).toBe(200);
    const bytes = Buffer.from(await image.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1440);
    expect(await readFile(path.join(result.directory, name))).toEqual(bytes);
  }));

  const packageSlug = "2026-10-03-ai-models-agents-and-verification";
  const packageHtml = await (await fetch(base + "/preview/xiaohongshu?slug=" + packageSlug)).text();
  const packageToken = packageHtml.match(/data-token="([^"]+)"/)?.[1];
  expect(packageToken).toBeTruthy();
  const packageRoot = await mkdtemp(path.join(os.tmpdir(), "outpost-package-http-"));
  const packageResponse = await fetch(base + "/api/export-package", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base, "x-outpost-token": packageToken! },
    body: JSON.stringify({ slug: packageSlug, platform: "xiaohongshu", directory: packageRoot }),
  });
  expect(packageResponse.status).toBe(200);
  const packageResult = await packageResponse.json();
  expect(path.basename(packageResult.directory)).toMatch(/^AI-Outpost-006-Xiaohongshu-/);
  expect(packageResult.names).toEqual(expect.arrayContaining(["post.txt", "manifest.json", "02-carousel.jpg"]));
  expect((await readdir(packageResult.directory)).length).toBe(packageResult.count);
  console.log("Verified export:", result.directory, result.count);
}, 120000);
