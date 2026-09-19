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
  expect(html).toContain('id="directory-export"');
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
  expect(result.count).toBe(8);
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
  console.log("Verified export:", result.directory, result.count);
}, 120000);
