import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPath, inspectPaths } from './check-remote-boundary.mjs';

test('blocks issue materials, platform exports and local state records', () => {
  const findings = inspectPaths([
    'content/issues/issue-007.json',
    'public/images/issues/issue-007-hero.png',
    'exports/wechat/issue-007.html',
    '每一期底稿/007/manifest.json',
    'docs/reviews/ISSUE-007-REVIEW.md',
    'task_plan.md',
  ]);
  assert.equal(findings.length, 6);
  assert.equal(findings[0].reason, '每期事实稿、草稿和修订稿');
  assert.equal(findings.at(-1).reason, '本机任务状态和研究记录');
});

test('allows reusable code, tests and generic workflow rules', () => {
  for (const file of ['lib/publishing/prepare.ts', 'scripts/ops/check-remote-boundary.mjs', 'tests/content-schema.test.ts', 'docs/WORKFLOW.md', 'AGENTS.md']) {
    assert.deepEqual(classifyPath(file), { file, forbidden: false });
  }
});
