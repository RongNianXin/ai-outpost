import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand } from "../lib/publishing/commands";
import { getBlockingChanges, parseGitStatus } from "../lib/publishing/git-state";
import { loadIssueFiles } from "../lib/content/load-files";

describe("real Git command to publishing gate", () => {
  it("preserves unstaged columns and still blocks staged/unrelated files", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "outpost-git-test-"));
    const git = async (...args: string[]) => {
      const result = await runCommand("git", ["-C", directory, ...args]);
      expect(result.ok, result.stderr).toBe(true);
      return result.stdout;
    };
    try {
      await git("init");
      await mkdir(path.join(directory, "ops"));
      const file = path.join(directory, "ops", "weekly-run-state.json");
      await writeFile(file, "original\n");
      await git("add", ".");
      await git("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
        "-c", "commit.gpgsign=false", "commit", "-m", "fixture");
      const issue = (await loadIssueFiles()).find(item => item.issue.id === "issue-003")!.issue;
      expect(parseGitStatus(await git("status", "--porcelain"))).toEqual([]);
      await writeFile(file, "changed\n");
      const changes = parseGitStatus(await git("status", "--porcelain"));
      expect(changes).toEqual([{ code: " M", path: "ops/weekly-run-state.json", staged: false }]);
      expect(getBlockingChanges(changes, issue)).toEqual([]);
      await git("add", "ops/weekly-run-state.json");
      expect(getBlockingChanges(parseGitStatus(await git("status", "--porcelain")), issue)).toHaveLength(1);
      await writeFile(path.join(directory, "unrelated.txt"), "unrelated\n");
      expect(getBlockingChanges(parseGitStatus(await git("status", "--porcelain")), issue)).toHaveLength(2);
    } finally {
      // Only the exact fresh fixture directory created above is removed.
      await rm(directory, { recursive: true, force: true });
    }
  });
});
