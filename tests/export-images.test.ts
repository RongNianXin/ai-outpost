import { test, expect } from "vitest";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { exportImagesToDirectory } from "../lib/publishing/export-images";

test("exports only listed images in order, verifies bytes and isolates repeated exports", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "outpost-export-test-"));
  const sources = [];
  for (let i = 0; i < 8; i++) {
    const source = path.join(root, `source-${i}.jpg`);
    await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: i * 20, g: 0, b: 0 } } }).jpeg().toFile(source);
    sources.push(source);
  }
  await writeFile(path.join(root, "historical.jpg"), "untouched");
  const first = await exportImagesToDirectory(root, sources, 4);
  const second = await exportImagesToDirectory(root, sources, 4);
  expect(first.directory).not.toBe(second.directory);
  expect(first.count).toBe(8);
  expect(await readdir(first.directory)).toEqual(first.names);
  expect(first.names[0]).toBe("01-cover.jpg");
  expect(first.names[7]).toBe("08-carousel.jpg");
  for (let i = 0; i < 8; i++) {
    expect(await readFile(path.join(first.directory, first.names[i]))).toEqual(await readFile(sources[i]));
  }
  expect(await readFile(path.join(root, "historical.jpg"), "utf8")).toBe("untouched");
  await expect(exportImagesToDirectory("relative", sources, 4)).rejects.toThrow();
  await expect(exportImagesToDirectory(root, [], 4)).rejects.toThrow();
  await expect(exportImagesToDirectory(root, [path.join(root, "historical.jpg")], 4)).rejects.toThrow();
});
