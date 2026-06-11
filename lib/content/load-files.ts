import { promises as fs } from "node:fs";
import path from "node:path";

import { issueSchema, type Issue } from "./schema";

export async function loadIssueFiles(): Promise<
  Array<{ fileName: string; issue: Issue }>
> {
  const issuesDirectory = path.join(process.cwd(), "content", "issues");
  const fileNames = (await fs.readdir(issuesDirectory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(issuesDirectory, fileName);
      const contents = await fs.readFile(filePath, "utf8");
      return {
        fileName,
        issue: issueSchema.parse(JSON.parse(stripBom(contents))),
      };
    }),
  );
}

function stripBom(contents: string) {
  return contents.replace(/^\uFEFF/, "");
}
