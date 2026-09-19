import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

test("save form submits directory and token, shows confirmed output and concrete failures", async () => {
  let submit: (event: { preventDefault(): void }) => Promise<void>;
  const button = { disabled: false };
  const status = { textContent: "" };
  const copy = { hidden: true };
  const input = { value: '"C:\\Users\\example\\Downloads"' };
  const form = {
    dataset: { slug: "test-issue", token: "test-token" },
    querySelector: () => button,
    addEventListener: (_: string, fn: typeof submit) => { submit = fn; },
  };
  const nodes: Record<string, unknown> = {
    "#directory-export": form, "#export-status": status,
    "#copy-export-path": copy, "#export-directory": input,
  };
  let fail = false;
  const source = await readFile("scripts/publish-console/preview.js", "utf8");
  vm.runInNewContext(source, {
    document: { querySelectorAll: () => [], querySelector: (selector: string) => nodes[selector] },
    fetch: async (url: string, options: { headers: Record<string, string>; body: string }) => {
      expect(url).toBe("/api/export-images");
      expect(options.headers["x-outpost-token"]).toBe("test-token");
      expect(JSON.parse(options.body).directory).toBe("C:\\Users\\example\\Downloads");
      return { ok: !fail, json: async () => fail ? { error: "EACCES permission denied" } : { count: 8, directory: "saved-path", names: ["01-cover.jpg"] } };
    },
  });
  await submit!({ preventDefault() {} });
  expect(status.textContent).toContain("已保存并核对 8 张");
  expect(status.textContent).toContain("saved-path");
  expect(copy.hidden).toBe(false);
  expect(button.disabled).toBe(false);
  fail = true;
  await submit!({ preventDefault() {} });
  expect(status.textContent).toContain("EACCES permission denied");
  expect(status.textContent).not.toContain("已取消");
  expect(copy.hidden).toBe(true);
  expect(button.disabled).toBe(false);
});
