import { mkdtemp, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type ExportPlatform = "xiaohongshu" | "wechat" | "zhihu" | string;

export type ExportFile = {
  path: string;
  name: string;
};

const platformFolderNames: Record<string, string> = {
  xiaohongshu: "Xiaohongshu",
  wechat: "WeChat",
  zhihu: "Zhihu",
};

export function getPlatformFolderName(platform: ExportPlatform) {
  const known = platformFolderNames[platform.toLowerCase()];
  if (known) return known;
  const safe = platform
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe ? safe[0].toUpperCase() + safe.slice(1) : "Platform";
}

export async function exportFilesToDirectory(
  parent: string,
  files: ExportFile[],
  issueNumber: number,
  platform: ExportPlatform,
) {
  const trimmedParent = parent.trim();
  if (!path.isAbsolute(trimmedParent)) throw new Error("请输入完整的本地文件夹路径。");
  const root = await realpath(trimmedParent);
  if (!(await stat(root)).isDirectory()) throw new Error("目标不是文件夹。");
  if (!files.length) throw new Error("资料清单为空。");

  const names = files.map((file) => file.name);
  if (
    names.some((name) => !name || name === "." || name === ".." || path.basename(name) !== name)
    || new Set(names).size !== names.length
  ) {
    throw new Error("资料文件名不符合安全规则。");
  }

  const contents = await Promise.all(files.map(async (file) => {
    const sourceStat = await stat(file.path);
    if (!sourceStat.isFile()) throw new Error(`资料源不是文件：${file.path}`);
    return readFile(file.path);
  }));
  const folderName = getPlatformFolderName(platform);
  const directory = await mkdtemp(
    path.join(root, `AI-Outpost-${String(issueNumber).padStart(3, "0")}-${folderName}-`),
  );
  const savedNames: string[] = [];
  for (let index = 0; index < files.length; index++) {
    const destination = path.join(directory, names[index]);
    try {
      await writeFile(destination, contents[index], { flag: "wx" });
      if (!(await readFile(destination)).equals(contents[index])) throw new Error("文件回读不一致");
    } catch (error) {
      throw new Error(`已保存 ${savedNames.length}/${files.length} 个文件，目录：${directory}；${String(error)}`);
    }
    savedNames.push(names[index]);
  }
  return { directory, count: savedNames.length, names: savedNames, platform: folderName };
}
