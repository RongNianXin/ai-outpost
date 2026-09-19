document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.querySelector(button.dataset.copyTarget);
    if (!target) return;
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([target.innerHTML], { type: "text/html" }),
            "text/plain": new Blob([target.innerText], { type: "text/plain" }),
          }),
        ]);
      } else {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();
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
  document.querySelector("#export-directory")?.focus();
});
const exportForm = document.querySelector("#directory-export");
exportForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = exportForm.querySelector('[type="submit"]');
  const status = document.querySelector("#export-status");
  const copy = document.querySelector("#copy-export-path");
  button.disabled = true;
  copy.hidden = true;
  status.textContent = "正在保存并回读核对图片，请稍候……";
  try {
    const response = await fetch("/api/export-images", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-outpost-token": exportForm.dataset.token },
      body: JSON.stringify({
        slug: exportForm.dataset.slug,
        directory: document.querySelector("#export-directory").value.trim().replace(/^"(.*)"$/, "$1"),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `保存失败（HTTP ${response.status}）`);
    status.textContent = `已保存并核对 ${result.count} 张图片。目录：\n${result.directory}\n${result.names.join("、")}`;
    copy.hidden = false;
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(result.directory); copy.textContent = "目录已复制"; }
      catch { status.textContent += "\n复制受限，请选中上面的目录路径手动复制。"; }
    };
  } catch (error) {
    status.textContent = `保存未完成：${error.message || String(error)}。若显示已保存目录，请先检查该目录再重试；把此处完整提示发给我。`;
  } finally { button.disabled = false; }
});
