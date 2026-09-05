import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type PublishPlatform = "website" | "wechat" | "xiaohongshu";
export type PublishAction =
  | "website_publish"
  | "wechat_draft"
  | "wechat_publish"
  | "xiaohongshu_private"
  | "xiaohongshu_publish";

export type PublishReceipt = {
  id: string;
  issueId: string;
  issueHash: string;
  platform: PublishPlatform;
  action: PublishAction;
  status: "succeeded" | "failed";
  createdAt: string;
  externalId?: string;
  detail: string;
};

type PublishState = {
  schemaVersion: 1;
  receipts: PublishReceipt[];
};

const statePath = path.join(
  process.cwd(),
  ".local",
  "publish-state.json",
);
let writeQueue: Promise<unknown> = Promise.resolve();

export async function readPublishState(): Promise<PublishState> {
  try {
    const contents = await readFile(statePath, "utf8");
    const parsed = JSON.parse(contents) as PublishState;
    return parsed.schemaVersion === 1 && Array.isArray(parsed.receipts)
      ? parsed
      : { schemaVersion: 1, receipts: [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schemaVersion: 1, receipts: [] };
    }
    throw error;
  }
}

export async function findSuccessfulReceipt(
  issueId: string,
  issueHash: string,
  action: PublishAction,
) {
  const state = await readPublishState();
  return state.receipts.find(
    (receipt) =>
      receipt.issueId === issueId &&
      receipt.issueHash === issueHash &&
      receipt.action === action &&
      receipt.status === "succeeded",
  );
}

export async function appendPublishReceipt(
  receipt: Omit<PublishReceipt, "id" | "createdAt">,
) {
  const operation = writeQueue.then(async () => {
    const state = await readPublishState();
    const nextReceipt: PublishReceipt = {
      ...receipt,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    state.receipts.push(nextReceipt);
    await mkdir(path.dirname(statePath), { recursive: true });
    const temporaryPath = `${statePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporaryPath, statePath);
    return nextReceipt;
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}
