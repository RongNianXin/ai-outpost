import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { evaluatePublishingGate, readPublishingGate } from "../lib/publishing/run-gate";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
const valid = { mode: "normal", issueId: "issue-003", requiresUserConfirmation: true };
beforeEach(() => vi.resetAllMocks());

describe("fail-closed run gate", () => {
  it("allows only normal with matching issue and mandatory confirmation", () => {
    expect(evaluatePublishingGate(valid, "issue-003").ok).toBe(true);
  });
  it.each(["draft_only", "paused", "emergency_stop", "unknown", null])("blocks mode %s", (mode) => {
    expect(evaluatePublishingGate({ ...valid, mode }, "issue-003").ok).toBe(false);
  });
  it.each([{}, null, [], { ...valid, requiresUserConfirmation: false },
    { ...valid, issueId: "issue-002" }])("blocks malformed or mismatched state %#", (input) => {
    expect(evaluatePublishingGate(input, "issue-003").ok).toBe(false);
  });
  it("blocks unreadable and malformed files without leaking contents", async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error("ENOENT"));
    expect((await readPublishingGate("issue-003")).ok).toBe(false);
    vi.mocked(readFile).mockResolvedValueOnce("{broken-secret");
    const result = await readPublishingGate("issue-003");
    expect(result.ok).toBe(false);
    expect(result.detail).not.toContain("secret");
  });
  it("re-reads state and supports UTF-8 BOM", async () => {
    vi.mocked(readFile).mockResolvedValueOnce("\uFEFF" + JSON.stringify(valid))
      .mockResolvedValueOnce(JSON.stringify({ ...valid, mode: "emergency_stop" }));
    expect((await readPublishingGate("issue-003")).ok).toBe(true);
    expect((await readPublishingGate("issue-003")).ok).toBe(false);
    expect(readFile).toHaveBeenCalledTimes(2);
  });
});
