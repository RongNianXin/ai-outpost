import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const stateSchema = z.object({
  mode: z.enum(["normal", "draft_only", "paused", "emergency_stop"]),
  issueId: z.string().min(1),
  requiresUserConfirmation: z.literal(true),
});

export function evaluatePublishingGate(input: unknown, issueId: string) {
  const parsed = stateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, detail: "运行状态配置无效，已禁止外部写入。请检查模式、期刊 ID 和人工确认设置。" };
  const state = parsed.data;
  if (state.mode !== "normal") return {
    ok: false,
    detail: `当前运行模式为 ${state.mode}，禁止外部写入（含公众号草稿和小红书私密测试）；本地生成与预览不受影响。`,
  };
  if (state.issueId !== issueId) return { ok: false, detail: "运行状态对应的期刊与当前期刊不一致，已禁止外部写入。" };
  return { ok: true, detail: "运行模式 normal 且期刊匹配；发送仍需本次明确确认。" };
}

export async function readPublishingGate(issueId: string) {
  try {
    const text = await readFile(path.join(process.cwd(), "ops", "weekly-run-state.json"), "utf8");
    return evaluatePublishingGate(JSON.parse(text.replace(/^\uFEFF/, "")), issueId);
  } catch {
    return { ok: false, detail: "无法读取或解析运行状态，已禁止外部写入；本地预览仍可使用。" };
  }
}

// Read afresh at each boundary: never cache permission across preparation/builds.
export async function assertPublishingAllowed(issueId: string) {
  const gate = await readPublishingGate(issueId);
  if (!gate.ok) throw new Error(gate.detail);
}
