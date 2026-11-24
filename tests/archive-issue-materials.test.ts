import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rm, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import vm from "node:vm";
import ts from "typescript";

const exec = promisify(execFile);

async function fixture(fileName: string, number: number, missing = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), "outpost-archive-"));
  await mkdir(path.join(root, "scripts/ops"), { recursive: true });
  await mkdir(path.join(root, "content/issues"), { recursive: true });
  await copyFile("scripts/ops/archive-issue-materials.mjs", path.join(root, "scripts/ops/archive-issue-materials.mjs"));
  const issue = { id: fileName.slice(0, -5), issueNumber: number, slug: "synthetic-archive", title: "Synthetic archive", status: fileName.includes("draft") ? "draft" : "approved" };
  if (!missing) await writeFile(path.join(root, "content/issues", fileName), JSON.stringify(issue));
  const run = (...args: string[]) => exec(process.execPath, [path.join(root, "scripts/ops/archive-issue-materials.mjs"), ...args], { cwd: root });
  return { root, issue, run, clean: () => rm(root, { recursive: true, force: true }) };
}

test.each([
  ["issue-002.json", 2, "002"],
  ["issue-002-draft.json", 2, "002/drafts/issue-002-draft"],
  ["draft-synthetic.json", 0, "drafts/draft-synthetic"],
] as const)("archives the exact selected source %s", async (fileName, number, destination) => {
  const f = await fixture(fileName, number);
  try {
    await f.run("--file", fileName, "--check");
    await expect(access(path.join(f.root, "每一期底稿"))).rejects.toThrow();
    const result = JSON.parse((await f.run("--file", fileName)).stdout);
    expect(result[0].fileName).toBe(fileName);
    const manifest = JSON.parse(await readFile(path.join(f.root, "每一期底稿", destination, "manifest.json"), "utf8"));
    expect(manifest.issueId).toBe(f.issue.id);
    expect(manifest.entries[0].source).toBe(`content/issues/${fileName}`);
  } finally { await f.clean(); }
});

test("prepare rejects an absent archive input before generating any package", async () => {
  const f = await fixture("issue-002-draft.json", 2, true);
  try {
    const source = await readFile("scripts/publish/prepare.ts", "utf8");
    const body = source.slice(source.indexOf("async function main()"), source.indexOf("void main();"));
    let writes = 0;
    const context = vm.createContext({ path, process: { execPath: process.execPath, cwd: () => f.root, argv: ["node", "prepare", "--slug", f.issue.slug] },
      loadIssueFiles: async () => [{ fileName: "issue-002-draft.json", issue: f.issue }],
      preparePlatformPackage: async () => { writes++; return {}; }, execFileAsync: exec, console: { log() {} } });
    vm.runInContext(ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
    await expect(context.main()).rejects.toThrow();
    expect(writes).toBe(0);
  } finally { await f.clean(); }
});

test("archive refuses a source outside content/issues", async () => {
  const f = await fixture("issue-002.json", 2);
  try { await expect(f.run("--file", "../issue-002.json", "--check")).rejects.toThrow(); }
  finally { await f.clean(); }
});
