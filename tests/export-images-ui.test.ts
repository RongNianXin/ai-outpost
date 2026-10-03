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
    dataset: { slug: "test-issue", token: "test-token", endpoint: "/api/export-package", platform: "xiaohongshu" },
    querySelector: (selector: string) => selector === '[type="submit"]' ? button : null,
    addEventListener: (_: string, fn: typeof submit) => { submit = fn; },
  };
  const nodes: Record<string, unknown> = {
    "#directory-export": form, "#export-status": status,
    "#copy-export-path": copy, "#export-directory": input,
  };
  let fail = false;
  let networkFail = false;
  const source = await readFile("scripts/publish-console/preview.js", "utf8");
  vm.runInNewContext(source, {
    document: { querySelectorAll: (selector: string) => selector.includes("package-export") ? [form] : [], querySelector: (selector: string) => nodes[selector] },
    fetch: async (url: string, options: { headers: Record<string, string>; body: string }) => {
      expect(url).toBe("/api/export-package");
      expect(options.headers["x-outpost-token"]).toBe("test-token");
      expect(JSON.parse(options.body).directory).toBe("C:\\Users\\example\\Downloads");
      expect(JSON.parse(options.body).platform).toBe("xiaohongshu");
      if (networkFail) throw new TypeError("Failed to fetch");
      return { ok: !fail, json: async () => fail ? { error: "EACCES permission denied" } : { count: 8, directory: "saved-path", names: ["01-cover.jpg"] } };
    },
  });
  await submit!({ preventDefault() {} });
  expect(status.textContent).toContain("已保存并核对 8 个文件");
  expect(status.textContent).toContain("saved-path");
  expect(copy.hidden).toBe(false);
  expect(button.disabled).toBe(false);
  fail = true;
  await submit!({ preventDefault() {} });
  expect(status.textContent).toContain("EACCES permission denied");
  expect(status.textContent).not.toContain("已取消");
  expect(copy.hidden).toBe(true);
  expect(button.disabled).toBe(false);
  networkFail = true;
  fail = false;
  await submit!({ preventDefault() {} });
  expect(status.textContent).toContain("无法连接本机发布控制台");
  expect(status.textContent).toContain("127.0.0.1:3101");
  expect(status.textContent).toContain("publish:console");
  expect(button.disabled).toBe(false);
});
