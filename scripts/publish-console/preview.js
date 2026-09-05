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
