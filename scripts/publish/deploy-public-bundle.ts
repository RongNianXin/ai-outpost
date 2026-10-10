import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { issueSchema } from "../../lib/content/schema";
import { assertPublishingAllowed } from "../../lib/publishing/run-gate";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
}

async function main() {
  const issueFile = argument("--issue");
  const archive = path.resolve(argument("--archive"));
  if (path.basename(archive) !== "site.tar.gz") throw new Error("Deployment asset must be named site.tar.gz");
  const codeSha = argument("--code-sha");
  const confirmation = argument("--confirmation");
  const issue = issueSchema.parse(JSON.parse((await readFile(issueFile, "utf8")).replace(/^\uFEFF/, "")));
  const issueLabel = String(issue.issueNumber).padStart(3, "0");
  if (confirmation !== `发布官网第${issueLabel}期`) throw new Error("Wrong publication confirmation");
  if (!new Set(["published", "corrected"]).has(issue.status)) throw new Error("Public build candidate required");
  if (!/^[a-f0-9]{40}$/.test(codeSha)) throw new Error("Exact remote code SHA required");
  const repository = "RongNianXin/ai-outpost";
  const gh = (args: string[]) => execFileSync("gh", args, { encoding: "utf8", timeout: 120_000 }).trim();
  const current = gh(["api", `repos/${repository}/commits/main`, "--jq", ".sha"]);
  if (current !== codeSha) throw new Error("Remote code changed; rebuild/recheck before dispatch");
  await assertPublishingAllowed(issue.id);
  execFileSync("python", ["scripts/publish/pages-bundle.py", "--archive", archive, "--slug", issue.slug], { stdio: "inherit" });
  const sha256 = createHash("sha256").update(await readFile(archive)).digest("hex");
  const tag = `ai-outpost-pages-${issueLabel}-${Date.now()}`;
  const localDir = path.resolve(".local/pages-deploy");
  await mkdir(localDir, { recursive: true });
  const payloadFile = path.join(localDir, `${tag}.json`);
  await writeFile(payloadFile, JSON.stringify({ tag_name: tag, target_commitish: codeSha, name: "Temporary public Pages bundle", body: "Contains only validated public static site output; delete after deployment verification.", draft: true }));
  await assertPublishingAllowed(issue.id);
  const release = JSON.parse(gh(["api", "--method", "POST", `repos/${repository}/releases`, "--input", payloadFile])) as { id: number };
  // Persist recovery identity BEFORE further writes; retain the draft on failure for retry.
  const receiptFile = path.join(localDir, `${tag}-receipt.json`);
  const receipt = { repository, tag, releaseId: release.id, codeSha, sha256, issueId: issue.id, slug: issue.slug, state: "DRAFT_CREATED_NOT_DEPLOYED", createdAt: new Date().toISOString() };
  await writeFile(receiptFile, JSON.stringify(receipt, null, 2));
  await assertPublishingAllowed(issue.id);
  gh(["release", "upload", tag, archive, "--repo", repository]);
  const dispatchFile = path.join(localDir, `${tag}-dispatch.json`);
  await writeFile(dispatchFile, JSON.stringify({ ref: "main", inputs: { release_id: String(release.id), sha256, slug: issue.slug } }));
  await assertPublishingAllowed(issue.id);
  gh(["api", "--method", "POST", `repos/${repository}/actions/workflows/deploy-pages.yml/dispatches`, "--input", dispatchFile]);
  receipt.state = "DISPATCHED_NOT_VERIFIED";
  await writeFile(receiptFile, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ ...receipt, receiptFile }));
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
