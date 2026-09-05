"use client";

import { useRef, useState, type MouseEvent } from "react";
import styles from "./InspirationPack.module.css";

export function InspirationPack({ markdown, href, filename }: {
  markdown: string; href: string; filename: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);

  function manualCopy() {
    if (details.current) details.current.open = true;
    text.current?.focus();
    text.current?.select();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setMessage("已复制，可直接粘贴给专项 AI。");
    } catch {
      manualCopy();
      setMessage("浏览器未允许自动复制。全文已选中，请按 Ctrl+C，或长按复制。");
    }
  }

  async function download(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("正在检查本期文件…");
    try {
      const response = await fetch(href, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok || await response.text() !== markdown) throw new Error("Unavailable or stale file");
      const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage("已请求下载；若浏览器拦截，请使用复制 Markdown。");
    } catch {
      setMessage("下载未完成：文件暂不可用或与页面版本不一致。请刷新重试，或复制 Markdown。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.pack} id="inspiration-pack" aria-labelledby="inspiration-title">
      <div className={styles.header}>
        <div>
          <h2 id="inspiration-title">灵感探索资料包</h2>
          <p>把本期资讯交给专项 AI，继续研究应用场景与产品机会。</p>
        </div>
        <span className={styles.format}>.md</span>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={copy}>复制 Markdown</button>
        <a href={href} download={filename} onClick={download} aria-disabled={busy}>
          {busy ? "检查文件中…" : "下载 .md"}
        </a>
      </div>
      <p className={styles.status} role="status" aria-live="polite">{message}</p>
      <details ref={details}>
        <summary>展开查看资料包</summary>
        <p>包含本期摘要、事实与限制、来源链接和研究指令。灵感假设仍需进一步验证。</p>
        <textarea ref={text} aria-label="本期 Markdown 资料包" readOnly value={markdown} spellCheck={false} />
      </details>
    </section>
  );
}
