import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSchema } from "../lib/content/schema";
import { actionLabels, executePublishAction } from "../lib/publishing/actions";
import { assertPublishingAllowed } from "../lib/publishing/run-gate";
import { preparePlatformPackage } from "../lib/publishing/prepare";
import { findSuccessfulReceipt } from "../lib/publishing/store";
import { publishWebsite } from "../lib/publishing/adapters/website";
import { createWechatDraft, publishWechatDraft } from "../lib/publishing/adapters/wechat";
import { publishXiaohongshu } from "../lib/publishing/adapters/xiaohongshu";

vi.mock("../lib/publishing/run-gate", () => ({ assertPublishingAllowed: vi.fn() }));
vi.mock("../lib/publishing/prepare", () => ({ preparePlatformPackage: vi.fn() }));
vi.mock("../lib/publishing/preflight", () => ({ getPublishingStatus: vi.fn(async () => ({
  platforms: ["website", "wechat", "xiaohongshu"].map(platform => ({ platform, ready: true })),
})) }));
vi.mock("../lib/publishing/store", () => ({ findSuccessfulReceipt: vi.fn(), appendPublishReceipt: vi.fn() }));
vi.mock("../lib/publishing/adapters/website", () => ({ publishWebsite: vi.fn() }));
vi.mock("../lib/publishing/adapters/wechat", () => ({ createWechatDraft: vi.fn(), publishWechatDraft: vi.fn() }));
vi.mock("../lib/publishing/adapters/xiaohongshu", () => ({ publishXiaohongshu: vi.fn() }));

const issue = issueSchema.parse(JSON.parse(readFileSync("content/issues/issue-003.json", "utf8")));
issue.status = "published"; // In-memory fixture only; no file or platform writes.
const actions = Object.keys(actionLabels) as Array<keyof typeof actionLabels>;
const adapters = [publishWebsite, createWechatDraft, publishWechatDraft, publishXiaohongshu];
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(assertPublishingAllowed).mockResolvedValue(undefined);
  vi.mocked(preparePlatformPackage).mockResolvedValue({
    hash: "test", files: { wechatHtml: "test", wechatCover: "test", xiaohongshuCover: "test" },
    xiaohongshu: { title: "test", body: "test" },
  } as Awaited<ReturnType<typeof preparePlatformPackage>>);
  vi.mocked(publishWebsite).mockResolvedValue({ externalId: "test", detail: "mock" });
  vi.mocked(publishXiaohongshu).mockResolvedValue({ externalId: "test", detail: "mock" });
  vi.mocked(createWechatDraft).mockResolvedValue("draft");
  vi.mocked(publishWechatDraft).mockResolvedValue("published");
});
describe("all external action boundaries (mock adapters only)", () => {
  it.each(actions)("blocks %s before preparation or sending", async (action) => {
    vi.mocked(assertPublishingAllowed).mockRejectedValue(new Error("draft_only"));
    await expect(executePublishAction(issue, action, actionLabels[action].phrase(issue))).rejects.toThrow("draft_only");
    expect(preparePlatformPackage).not.toHaveBeenCalled();
    for (const adapter of adapters) expect(adapter).not.toHaveBeenCalled();
  });
  it.each(actions)("rechecks %s after preparation", async (action) => {
    vi.mocked(assertPublishingAllowed).mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("emergency_stop"));
    await expect(executePublishAction(issue, action, actionLabels[action].phrase(issue))).rejects.toThrow("emergency_stop");
    for (const adapter of adapters) expect(adapter).not.toHaveBeenCalled();
  });
  it.each(actions)("normal permits %s only with the exact confirmation", async (action) => {
    await expect(executePublishAction(issue, action, "wrong")).rejects.toThrow("确认句");
    vi.mocked(findSuccessfulReceipt).mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ externalId: "draft" } as Awaited<ReturnType<typeof findSuccessfulReceipt>>);
    await executePublishAction(issue, action, actionLabels[action].phrase(issue));
    expect(adapters.reduce((n, adapter) => n + vi.mocked(adapter).mock.calls.length, 0)).toBe(1);
  });
});
