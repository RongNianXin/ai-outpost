import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, shouldNotify } from './check-weekly.mjs';
const state = { mode: 'draft_only', issueId: 'internal-new', period: { end: '2026-09-12' } };
const base = { now: '2026-09-12T10:01:00+08:00', state: { mode: 'draft_only' }, issues: [], scheduleStatus: 'ACTIVE' };
const draft = { id: 'internal-new', issueNumber: 3, status: 'draft', period: { end: '2026-09-12' } };
test('before due, at due, delayed login and multiple missed weeks', () => {
  assert.equal(evaluate({ ...base, now: '2026-09-12T09:59:59+08:00' }).weeks.length, 0);
  assert.equal(evaluate({ ...base, now: '2026-09-12T10:00:00+08:00' }).weeks[0].stage, 'not_started');
  assert.equal(evaluate({ ...base, now: '2026-09-12T14:00:00+08:00' }).notify, true);
  assert.equal(evaluate({ ...base, now: '2026-09-26T10:00:00+08:00' }).weeks.length, 3);
});
test('paused schedule or intentional emergency never requests recovery', () => {
  assert.equal(evaluate({ ...base, scheduleStatus: 'PAUSED' }).notify, false);
  assert.equal(evaluate({ ...base, state: { mode: 'emergency_stop' } }).notify, false);
});
test('awaiting review, interrupted and draft are distinct; inputs unchanged', () => {
  const input = { ...base, state: { ...state, lastStep: 'awaiting_human_review' }, issues: [draft] };
  const before = JSON.stringify(input);
  assert.equal(evaluate(input).weeks[0].stage, 'awaiting_review');
  assert.equal(JSON.stringify(input), before);
  assert.equal(evaluate({ ...input, state: { ...state, failureReason: 'timeout' } }).weeks[0].stage, 'interrupted');
  assert.equal(evaluate({ ...input, state }).weeks[0].stage, 'draft_needs_reconciliation');
});
test('late publication and internal issue003 do not complete public003 week', () => {
  const old = { ...draft, id: 'issue-003', issueNumber: 2, status: 'corrected', publishedAt: base.now, period: { end: '2026-09-05' } };
  assert.equal(evaluate({ ...base, issues: [old] }).weeks[0].stage, 'not_started');
  assert.equal(evaluate({ ...base, issues: [{ ...draft, status: 'published', publishedAt: base.now }] }).weeks[0].stage, 'published_local_record');
});
test('stale state, unknown scheduler, duplicates, invalid input are explicit', () => {
  assert.equal(evaluate({ ...base, scheduleStatus: 'UNKNOWN' }).notify, true);
  assert.equal(evaluate({ ...base, issues: [draft, { ...draft, id: 'other' }] }).weeks[0].stage, 'ambiguous');
  assert.throws(() => evaluate({ ...base, now: 'bad' }));
  assert.throws(() => evaluate({ ...base, state: { mode: 'unknown' } }));
});
test('same state is deduplicated; changed stage is a new notice', () => {
  const a = evaluate(base), b = evaluate({ ...base, now: '2026-09-12T14:00:00+08:00' });
  assert.equal(shouldNotify(b, { key: a.key }), false);
  const c = evaluate({ ...base, state: { ...state, failureReason: 'crash' } });
  assert.equal(shouldNotify(c, { key: a.key }), true);
});
