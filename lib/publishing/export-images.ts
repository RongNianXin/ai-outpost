import { writeFile, mkdtemp, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

export async function exportImagesToDirectory(parent: string, images: string[], issueNumber: number) {
  if (!path.isAbsolute(parent.trim())) throw new Error("请输入完整的本地文件夹路径。");
  const root = await realpath(parent.trim());
  if (!(await stat(root)).isDirectory()) throw new Error("目标不是文件夹。");
  if (!images.length) throw new Error("图片清单为空。");
  // Validate all sources before creating a destination; never sweep an exports folder.
  const contents = await Promise.all(images.map((file) => readFile(file)));
  if (contents.some((bytes) => bytes.length < 3 || bytes[0] !== 255 || bytes[1] !== 216)) {
    throw new Error("稿包包含无效 JPEG，请重新生成。");
  }
  const directory = await mkdtemp(path.join(root, `AI-Outpost-${String(issueNumber).padStart(3, "0")}-`));
  const names: string[] = [];
  for (let index = 0; index < images.length; index++) {
    const name = `${String(index + 1).padStart(2, "0")}-${index === 0 ? "cover" : "carousel"}.jpg`;
    const destination = path.join(directory, name);
    try {
      await writeFile(destination, contents[index], { flag: "wx" });
      if (!(await readFile(destination)).equals(contents[index])) throw new Error("文件回读不一致");
    } catch (error) {
      throw new Error(`已保存 ${names.length}/${images.length} 张，目录：${directory}；${String(error)}`);
    }
    names.push(name);
  }
  return { directory, count: names.length, names };
}
