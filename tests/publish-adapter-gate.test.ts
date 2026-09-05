import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { issueSchema } from "../lib/content/schema";
import { assertPublishingAllowed } from "../lib/publishing/run-gate";
import { runCommand } from "../lib/publishing/commands";
import { publishWebsite } from "../lib/publishing/adapters/website";
import { createWechatDraft, publishWechatDraft } from "../lib/publishing/adapters/wechat";
import { publishXiaohongshu } from "../lib/publishing/adapters/xiaohongshu";
import { loadIssueFiles } from "../lib/content/load-files";

vi.mock("../lib/publishing/run-gate", () => ({ assertPublishingAllowed: vi.fn() }));
vi.mock("../lib/publishing/commands", () => ({ runCommand: vi.fn() }));
vi.mock("../lib/content/load-files", () => ({ loadIssueFiles: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn(), writeFile: vi.fn(), access: vi.fn() }));
vi.mock("../lib/publishing/config", () => ({ getWechatConfig: () => ({
  configured: true, appId: "mock", appSecret: "mock", author: "test",
}) }));
const issue = issueSchema.parse(JSON.parse(readFileSync("content/issues/issue-003.json", "utf8")));
const xhsInput = { issueId: issue.id, title: "test", body: "test", imagePath: "fake.jpg", isPrivate: true };
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

describe("adapter defense in depth", () => {
  it("direct adapter calls cannot bypass a blocked gate", async () => {
    vi.mocked(assertPublishingAllowed).mockRejectedValue(new Error("paused"));
    for (const action of [
      () => publishWebsite(issue),
      () => createWechatDraft(issue, "fake.html", "fake.jpg"),
      () => publishWechatDraft("draft", issue.id),
      () => publishXiaohongshu(xhsInput),
    ]) await expect(action()).rejects.toThrow("paused");
    expect(runCommand).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });
  it("website rechecks after build and restores local content without pushing", async () => {
    vi.mocked(assertPublishingAllowed).mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("emergency_stop"));
    vi.mocked(loadIssueFiles).mockResolvedValue([{ fileName: "issue-003.json", issue }]);
    vi.mocked(readFile).mockResolvedValue("original");
    vi.mocked(runCommand).mockImplementation(async (cmd, args) => ({
      ok: true, code: 0, stderr: "", stdout:
        cmd === "git" && args[0] === "branch" ? "main" :
        cmd === "git" && args[0] === "remote" ? "https://github.com/RongNianXin/ai-outpost.git" : "",
    }));
    await expect(publishWebsite(issue)).rejects.toThrow("emergency_stop");
    const calls = vi.mocked(runCommand).mock.calls;
    expect(calls.some(([cmd, args]) => cmd === "pnpm.cmd" && args[0] === "build")).toBe(true);
    expect(calls.some(([cmd, args]) =>
      (cmd === "git" && ["add", "commit", "push"].includes(args[0])) ||
      (cmd === "gh" && args[0] === "workflow"))).toBe(false);
    expect(vi.mocked(writeFile).mock.calls.some(([file, body]) =>
      String(file).endsWith("issue-003.json") && body === "original")).toBe(true);
  });
  it("WeChat stops before cover upload if the mode changes during authentication", async () => {
    vi.mocked(assertPublishingAllowed).mockResolvedValueOnce(undefined).mockRejectedValue(new Error("paused"));
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fake image"));
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ access_token: "mock" })));
    await expect(createWechatDraft(issue, "fake.html", "fake.jpg")).rejects.toThrow("paused");
    expect(fetch).toHaveBeenCalledTimes(1); // mocked token GET, no upload or draft POST
  });
  it("Xiaohongshu rechecks before launching the CLI", async () => {
    vi.mocked(assertPublishingAllowed).mockResolvedValueOnce(undefined).mockRejectedValue(new Error("paused"));
    await expect(publishXiaohongshu(xhsInput)).rejects.toThrow("paused");
    expect(runCommand).not.toHaveBeenCalled();
  });
});
