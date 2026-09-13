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
