import { readFileSync } from "node:fs";
import path from "node:path";

let loaded = false;

export function loadLocalEnvironment() {
  if (loaded) return;
  loaded = true;
  const filePath = path.join(process.cwd(), ".env.local");
  let contents = "";
  try {
    contents = readFileSync(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key) || process.env[key]) continue;
    process.env[key] = unwrap(line.slice(separator + 1).trim());
  }
}

export function getWechatConfig() {
  loadLocalEnvironment();
  const appId = process.env.WECHAT_APP_ID?.trim() ?? "";
  const appSecret = process.env.WECHAT_APP_SECRET?.trim() ?? "";
  return {
    appId,
    appSecret,
    author: process.env.WECHAT_AUTHOR?.trim() || "AI 前哨站",
    configured: Boolean(appId && appSecret),
  };
}

function unwrap(value: string) {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
