// Read-only by default. This checker never starts a run or changes publishing state.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEEK = 7 * 86400000;
const FIRST_DUE = '2026-09-12T10:00:00+08:00';
function localDay(ms) { return new Date(ms + 8 * 3600000).toISOString().slice(0, 10); }
function evaluate({ now, state, issues, scheduleStatus, firstDue = FIRST_DUE }) {
  const time = Date.parse(now), first = Date.parse(firstDue);
  if (!Number.isFinite(time) || !Number.isFinite(first)) throw Error('Invalid timestamp');
  if (!state || !Array.isArray(issues)) throw Error('Missing state or issues');
  const result = { checkedAt: now, scheduleStatus, notices: [], weeks: [], action: 'report_only' };
  if (!['normal', 'draft_only', 'paused', 'emergency_stop'].includes(state.mode)) throw Error('Unknown run mode');
  const count = time < first ? 0 : Math.floor((time - first) / WEEK) + 1;
  if (count > 260) throw Error('More than five years require manual reconciliation');
  const linked = issues.find(i => i.id === state.issueId);
  const published = i => ['published', 'corrected'].includes(i.status) && Number.isFinite(Date.parse(i.publishedAt));
  if (linked && published(linked) && /awaiting|review/.test(state.lastStep || '')) {
    result.notices.push('运行记录仍待审，但对应正式期刊已公开；需核对旧状态，不自动重跑。');
  }
  for (let n = 0; n < count; n++) {
    const due = first + n * WEEK, day = localDay(due);
    // Editorial period, not a late publication timestamp or internal file number.
    const matches = issues.filter(i => i.issueNumber > 0 && i.period?.end === day);
    let stage = 'not_started';
    if (matches.length > 1) stage = 'ambiguous';
    else if (matches.length === 1) {
      const issue = matches[0];
      if (published(issue)) stage = 'published_local_record';
      else if (state.issueId === issue.id && state.failureReason) stage = 'interrupted';
      else if (state.issueId === issue.id && /awaiting.*review|awaiting_human/.test(state.lastStep || '')) stage = 'awaiting_review';
      else stage = 'draft_needs_reconciliation';
    } else if (state.period?.end === day) {
      stage = state.failureReason ? 'interrupted' : 'run_needs_reconciliation';
    }
    result.weeks.push({ dueAt: new Date(due).toISOString(), periodEnd: day, stage });
  }
  const paused = scheduleStatus === 'PAUSED' || ['paused', 'emergency_stop'].includes(state.mode);
  if (paused) result.notices.push('主动暂停：仅报告状态，不补跑、不催办发布。');
  else if (scheduleStatus !== 'ACTIVE') result.notices.push('调度状态未知：核对配置，不推断已启用。');
  else if (result.weeks.some(w => w.stage !== 'published_local_record')) result.notices.push('有到期周尚未完成或需核对；保留已有稿件，核对后再决定恢复。');
  if (!count) result.notices.push('第 003 期计划时间尚未到达。');
  result.notify = !paused && (result.notices.some(n => !n.includes('尚未到达')));
  result.key = createHash('sha256').update(JSON.stringify({ scheduleStatus, mode: state.mode, weeks: result.weeks, notices: result.notices })).digest('hex');
  return result;
}
function shouldNotify(result, receipt) { return result.notify && receipt?.key !== result.key; }
function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function main() {
  const args = process.argv.slice(2);
  if (args.some(a => a.startsWith('--') && !['--now', '--record'].includes(a))) throw Error('Unknown argument');
  const nowIndex = args.indexOf('--now');
  const now = nowIndex < 0 ? new Date().toISOString() : args[nowIndex + 1];
  if (!now || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(now)) throw Error('Use an ISO timestamp with timezone');
  const root = path.resolve(__dirname, '../..');
  const state = json(path.join(root, 'ops/weekly-run-state.json'));
  const dir = path.join(root, 'content/issues');
  const issues = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => json(path.join(dir, f)));
  const config = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'automations/ai-outpost/automation.toml');
  let scheduleStatus = 'UNKNOWN';
  try { scheduleStatus = fs.readFileSync(config, 'utf8').match(/^status\s*=\s*"([^"]+)"/m)?.[1] || 'UNKNOWN'; } catch { /* report unknown */ }
  const result = evaluate({ now, state, issues, scheduleStatus });
  const receiptFile = path.join(root, '.local/weekly-check-receipt.json');
  let receipt;
  try { receipt = json(receiptFile); } catch { /* no valid receipt */ }
  result.newNotice = shouldNotify(result, receipt);
  console.log(JSON.stringify(result, null, 2));
  // Explicit local receipt only; stdout display is not an email/desktop delivery receipt.
  if (args.includes('--record')) {
    fs.mkdirSync(path.dirname(receiptFile), { recursive: true });
    const lock = receiptFile + '.lock';
    const fd = fs.openSync(lock, 'wx');
    try {
      const tmp = receiptFile + '.' + process.pid + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ key: result.key, displayedAt: now }, null, 2) + '\n');
      fs.renameSync(tmp, receiptFile);
    } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
}
export { evaluate, shouldNotify };
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) { try { main(); } catch (e) { console.error('周任务检查失败：' + e.message); process.exitCode = 1; } }
