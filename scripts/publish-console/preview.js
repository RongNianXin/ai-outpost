document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.querySelector(button.dataset.copyTarget);
    if (!target) return;
    try {
      const copy = target.cloneNode(true);
      copy.querySelectorAll("[data-copy-exclude]").forEach((element) => element.remove());
      copy.style.position = "fixed";
      copy.style.left = "-10000px";
      document.body.append(copy);
      const plainText = copy.innerText;
      copy.remove();
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([copy.innerHTML], { type: "text/html" }),
            "text/plain": new Blob([plainText], { type: "text/plain" }),
          }),
        ]);
      } else {
        const input = document.createElement("textarea");
        input.value = plainText;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      button.textContent = "已复制";
    } catch {
      button.textContent = "复制失败，请在正文内按 Ctrl+A、Ctrl+C";
    }
  });
});

document.querySelectorAll("[data-copy-value]").forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.dataset.copyValue ?? "";
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = "已复制";
    } catch {
      const input = document.createElement("textarea");
      input.value = value;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.append(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      button.textContent = "已复制（备用）";
    }
  });
});

document.querySelector("[data-export-focus]")?.addEventListener("click", () => {
  document.querySelector(".package-export input, #export-directory")?.focus();
});
const exportForms = Array.from(document.querySelectorAll(".package-export, #directory-export"));
for (const exportForm of exportForms) exportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = exportForm.querySelector('[type="submit"]');
  const status = exportForm.querySelector(".export-status") || document.querySelector("#export-status");
  const copy = exportForm.querySelector(".copy-export-path") || document.querySelector("#copy-export-path");
  const input = exportForm.querySelector("input") || document.querySelector("#export-directory");
  button.disabled = true;
  copy.hidden = true;
  status.textContent = "正在保存并回读核对资料，请稍候……";
  try {
    const response = await fetch(exportForm.dataset.endpoint || "/api/export-images", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-outpost-token": exportForm.dataset.token },
      body: JSON.stringify({
        slug: exportForm.dataset.slug,
        ...(exportForm.dataset.platform ? { platform: exportForm.dataset.platform } : {}),
        directory: input.value.trim().replace(/^"(.*)"$/, "$1"),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `保存失败（HTTP ${response.status}）`);
    status.textContent = `已保存并核对 ${result.count} 个文件。目录：\n${result.directory}\n${result.names.join("、")}`;
    copy.hidden = false;
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(result.directory); copy.textContent = "目录已复制"; }
      catch { status.textContent += "\n复制受限，请选中上面的目录路径手动复制。"; }
    };
  } catch (error) {
    const message = error?.message || String(error);
    if (message === "Failed to fetch" || message === "NetworkError when attempting to fetch resource.") {
      const slug = exportForm.dataset.slug || "当前期刊";
      status.textContent = `保存未完成：无法连接本机发布控制台（127.0.0.1:3101）。请在项目目录运行 pnpm.cmd publish:console -- --port 3101 --slug ${slug}，保持窗口运行后刷新本页再试。`;
    } else {
      status.textContent = `保存未完成：${message}。若显示已保存目录，请先检查该目录再重试；把此处完整提示发给我。`;
    }
  } finally { button.disabled = false; }
});
