import { expect, test, vi } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

async function harness(options: { missingManifest?: boolean; missingAsset?: boolean } = {}) {
  const source = await readFile("scripts/publish-console/server.ts", "utf8");
  const start = source.indexOf("function prepareCachedPackage(issue: Issue)");
  const end = source.indexOf("\nconst server = createServer", start);
  let currentHash = "first";
  const generate = vi.fn(async (issue: { hash: string }) => {
    currentHash = issue.hash;
    return { generated: true, hash: issue.hash };
  });
  const read = vi.fn(async () => {
    if (options.missingManifest) throw Object.assign(new Error("missing"), { code: "ENOENT" });
    return JSON.stringify({ issueId: "issue-008", hash: currentHash, files: { body: path.resolve("exports/body.html") } });
  });
  const context = vm.createContext({
    path, process, preparedPackageCache: new Map(), readFile: read,
    getIssuePackageHash: (issue: { hash: string }) => issue.hash,
    preparePlatformPackage: generate,
    stat: async () => {
      if (options.missingAsset) throw Object.assign(new Error("missing asset"), { code: "ENOENT" });
      return { isFile: () => true };
    },
  });
  vm.runInContext(ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const prepare = context.prepareCachedPackage as (issue: { id: string; slug: string; hash: string }) => Promise<{ hash: string }>;
  return { prepare, generate, read, diskHash: () => currentHash, changeHash: (hash: string) => { currentHash = hash; } };
}

test("same slug with new content hash does not reuse the old reviewed package", async () => {
  const h = await harness();
  const issue = { id: "issue-008", slug: "current-issue", hash: "first" };
  expect((await h.prepare(issue)).hash).toBe("first");
  await h.prepare(issue);
  expect(h.read).toHaveBeenCalledTimes(2);
  h.changeHash("second");
  expect((await h.prepare({ ...issue, hash: "second" })).hash).toBe("second");
  expect(h.read).toHaveBeenCalledTimes(3);
  expect(h.generate).not.toHaveBeenCalled();
});

test("A to B to A checks disk again and restores a consistent package", async () => {
  const h = await harness();
  const issue = { id: "issue-008", slug: "current-issue", hash: "first" };
  await h.prepare(issue);
  await h.prepare({ ...issue, hash: "second" });
  expect(h.diskHash()).toBe("second");
  expect((await h.prepare(issue)).hash).toBe("first");
  expect(h.diskHash()).toBe("first");
  expect(h.generate).toHaveBeenCalledTimes(2);
});

test("concurrent changes for one slug are serialized", async () => {
  const h = await harness();
  const issue = { id: "issue-008", slug: "current-issue", hash: "first" };
  const results = await Promise.all([h.prepare(issue), h.prepare({ ...issue, hash: "second" }), h.prepare(issue)]);
  expect(results.map((x) => x.hash)).toEqual(["first", "second", "first"]);
  expect(h.diskHash()).toBe("first");
});

test("missing reviewed asset fails without regenerating or overwriting the package", async () => {
  const h = await harness({ missingAsset: true });
  await expect(h.prepare({ id: "issue-008", slug: "current-issue", hash: "first" })).rejects.toThrow("已审稿包文件缺失");
  expect(h.generate).not.toHaveBeenCalled();
});

test("absent manifest still permits the normal initial package generation", async () => {
  const h = await harness({ missingManifest: true });
  await h.prepare({ id: "issue-008", slug: "current-issue", hash: "first" });
  expect(h.generate).toHaveBeenCalledTimes(1);
});
