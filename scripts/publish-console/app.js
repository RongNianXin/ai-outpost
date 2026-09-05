const root = document.body;
const token = root.dataset.sessionToken;
const defaultSlug = root.dataset.defaultSlug;
const select = document.querySelector("#issue-select");
const title = document.querySelector("#issue-title");
const meta = document.querySelector("#issue-meta");
const toast = document.querySelector("#toast");
const dialog = document.querySelector("#confirm-dialog");
const confirmPhrase = document.querySelector("#confirm-phrase");
const confirmInput = document.querySelector("#confirm-input");
const confirmSubmit = document.querySelector("#confirm-submit");
let selectedSlug = defaultSlug;
let phrases = {};
let pendingAction = null;
let currentIssue = null;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Outpost-Token": token,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

async function refresh() {
  setBusy(true);
  try {
    const data = await request(`/api/status?slug=${encodeURIComponent(selectedSlug || "")}`);
    selectedSlug = data.selected.slug;
    phrases = data.confirmationPhrases;
    renderIssues(data.issues, selectedSlug);
    renderIssue(data.selected);
    renderPlatforms(data.platforms, data.receipts);
    renderReceipts(data.receipts);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

function renderIssues(issues, currentSlug) {
  const previous = select.value;
  select.replaceChildren();
  issues.forEach((issue) => {
    const option = document.createElement("option");
    option.value = issue.slug;
    option.textContent = `第 ${String(issue.issueNumber).padStart(3, "0")} 期 · ${issue.status}`;
    option.selected = issue.slug === currentSlug;
    select.append(option);
  });
  if (!currentSlug && previous) select.value = previous;
}

function renderIssue(issue) {
  currentIssue = issue;
  title.textContent = issue.title;
  meta.textContent = `${issue.period.start} 至 ${issue.period.end} · ${issue.status}`;
  document.querySelector("#website-preview").href = `http://127.0.0.1:3100/issues/${issue.slug}/`;
  document.querySelector("#wechat-preview").href = `/preview/wechat?slug=${encodeURIComponent(issue.slug)}`;
  document.querySelector("#xhs-preview").href = `/preview/xiaohongshu?slug=${encodeURIComponent(issue.slug)}`;
}

function renderPlatforms(platforms, receipts) {
  platforms.forEach((platform) => {
    const article = document.querySelector(`[data-platform="${platform.platform}"]`);
    const pill = article.querySelector(".status-pill");
    pill.textContent = platform.ready ? "可以发送" : "还缺配置";
    pill.classList.toggle("ready", platform.ready);
    const list = article.querySelector(".checks");
    list.replaceChildren();
    platform.checks.forEach((check) => {
      const item = document.createElement("li");
      item.classList.toggle("ok", check.ok);
      item.append(document.createTextNode(check.label));
      const small = document.createElement("small");
      small.textContent = check.detail;
      item.append(small);
      list.append(item);
    });
    article.querySelectorAll("button[data-action]").forEach((button) => {
      button.disabled = !platform.ready;
      if (button.dataset.action === "wechat_publish") {
        const hasDraft = receipts.some((receipt) => receipt.action === "wechat_draft" && receipt.status === "succeeded");
        const websitePublic = ["published", "corrected"].includes(currentIssue?.status);
        button.disabled = !platform.ready || !hasDraft || !websitePublic;
        button.title = !hasDraft ? "请先创建与当前内容一致的公众号草稿" : (!websitePublic ? "请先发布官网，避免原文链接失效" : "");
      }
      if (button.dataset.action === "xiaohongshu_publish") {
        const websitePublic = ["published", "corrected"].includes(currentIssue?.status);
        button.disabled = !platform.ready || !websitePublic;
        button.title = websitePublic ? "" : "请先发布官网，避免原文链接失效";
      }
    });
  });
}

function renderReceipts(receipts) {
  const list = document.querySelector("#receipt-list");
  list.replaceChildren();
  if (!receipts.length) {
    const item = document.createElement("li");
    item.textContent = "还没有发布回执。";
    list.append(item);
    return;
  }
  receipts.forEach((receipt) => {
    const item = document.createElement("li");
    item.textContent = `${new Date(receipt.createdAt).toLocaleString("zh-CN")} · ${receipt.action} · ${receipt.detail}${receipt.externalId ? ` · ${receipt.externalId}` : ""}`;
    list.append(item);
  });
}

document.querySelector("#prepare-button").addEventListener("click", async () => {
  setBusy(true);
  try {
    const result = await request("/api/prepare", {
      method: "POST",
      body: JSON.stringify({ slug: selectedSlug }),
    });
    showToast(`发布包已生成：${result.manifestPath}`);
    await refresh();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
});

document.querySelector("#refresh-button").addEventListener("click", refresh);
select.addEventListener("change", () => {
  selectedSlug = select.value;
  refresh();
});

document.querySelectorAll("button[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    pendingAction = button.dataset.action;
    confirmPhrase.textContent = phrases[pendingAction];
    confirmInput.value = "";
    dialog.showModal();
    confirmInput.focus();
  });
});

confirmSubmit.addEventListener("click", async (event) => {
  event.preventDefault();
  if (!pendingAction) return;
  setBusy(true);
  try {
    const receipt = await request("/api/action", {
      method: "POST",
      body: JSON.stringify({
        slug: selectedSlug,
        action: pendingAction,
        confirmation: confirmInput.value,
      }),
    });
    dialog.close();
    showToast(receipt.detail);
    await refresh();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
});

function setBusy(busy) {
  document.querySelectorAll("button").forEach((button) => {
    if (busy) {
      button.dataset.wasDisabled = String(button.disabled);
      button.disabled = true;
    } else if (button.dataset.wasDisabled !== undefined) {
      button.disabled = button.dataset.wasDisabled === "true";
      delete button.dataset.wasDisabled;
    }
  });
}

let toastTimer;
function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 6500);
}

refresh();
