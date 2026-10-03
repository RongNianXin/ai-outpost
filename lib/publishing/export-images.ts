import { readFile } from "node:fs/promises";
import path from "node:path";
import { exportFilesToDirectory } from "./export-package";

export async function exportImagesToDirectory(parent: string, images: string[], issueNumber: number) {
  if (!images.length) throw new Error("图片清单为空。");
  // Validate all sources before creating a destination; never sweep an exports folder.
  const contents = await Promise.all(images.map((file) => readFile(file)));
  if (contents.some((bytes) => bytes.length < 3 || bytes[0] !== 255 || bytes[1] !== 216)) {
    throw new Error("稿包包含无效 JPEG，请重新生成。");
  }
  const filenames = images.map((image) => path.basename(image));
  if (filenames.some((name) => !/^\d{2}-(?:cover|carousel)\.jpg$/.test(name)) || new Set(filenames).size !== filenames.length) {
    throw new Error("图片文件名不符合稿包顺序。");
  }
  return exportFilesToDirectory(
    parent,
    images.map((image, index) => ({ path: image, name: filenames[index] })),
    issueNumber,
    "xiaohongshu",
  );
}
