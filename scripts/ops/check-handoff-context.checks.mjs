import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildHandoffContext, REQUIRED_HANDOFF_FILES, verifyHandoffSnapshot } from './check-handoff-context.mjs';

function git(root, args) {
  execFileSync('git', ['-C', root, ...args], { stdio: 'ignore' });
}

function createFixture() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'outpost-handoff-check-'));
  const repo = path.join(fixtureRoot, 'repo');
  fs.mkdirSync(repo);
  for (const relativePath of REQUIRED_HANDOFF_FILES) {
    const absolutePath = path.join(repo, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    const content = relativePath === 'docs/source-library/catalog.json'
      ? JSON.stringify({ entries: [{ id: 'official', kind: 'vendor', access: 'readable', entryUrl: 'https://example.com/', sensitivity: { scope: 'limited' } }] })
      : `${relativePath}\n`;
    fs.writeFileSync(absolutePath, content);
  }
  git(repo, ['init']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  git(repo, ['config', 'user.name', 'Handoff Test']);
  git(repo, ['add', '.']);
  git(repo, ['commit', '-m', 'fixture']);
  const privateDir = path.join(repo, '.local/source-library');
  fs.mkdirSync(privateDir, { recursive: true });
  fs.writeFileSync(path.join(repo, '.gitignore'), '/.local\n');
  fs.copyFileSync(path.join(repo, 'docs/source-library/catalog.json'), path.join(privateDir, 'catalog.json'));
  fs.writeFileSync(path.join(privateDir, 'README.md'), 'private guide');
  fs.writeFileSync(path.join(privateDir, 'research-notes.md'), 'private notes');
  return { fixtureRoot, repo };
}

test('check mode rejects an omitted snapshot instead of reporting a manifest as success', () => {
  const script = fileURLToPath(new URL('./check-handoff-context.mjs', import.meta.url));
  for (const args of [['--check'], ['--check', '--snapshot'], ['--check', '--snapshot', '--check']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /snapshot/);
    assert.doesNotMatch(result.stdout, /HANDOFF_CONTEXT/);
  }
});

test('snapshot manifest verifies the same decision context and detects later drift', () => {
  const { fixtureRoot, repo } = createFixture();
  try {
    const context = buildHandoffContext(repo);
    const snapshotPath = path.join(fixtureRoot, 'handoff.md');
    fs.writeFileSync(snapshotPath, `# Handoff\n\nHANDOFF_CONTEXT ${JSON.stringify(context)}\n`);
    assert.equal(verifyHandoffSnapshot(snapshotPath, buildHandoffContext(repo)).head, context.head);
    fs.appendFileSync(path.join(repo, 'findings.md'), 'new finding\n');
    assert.throws(() => verifyHandoffSnapshot(snapshotPath, buildHandoffContext(repo)), /漂移/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('missing canonical handoff material fails closed', () => {
  const { fixtureRoot, repo } = createFixture();
  try {
    fs.rmSync(path.join(repo, 'docs/PROMOTION.md'));
    assert.throws(() => buildHandoffContext(repo), /文件缺失/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('ignored private decisions are required and their changes invalidate handoff', () => {
  const { fixtureRoot, repo } = createFixture();
  try {
    const context = buildHandoffContext(repo);
    const snapshotPath = path.join(fixtureRoot, 'handoff.md');
    fs.writeFileSync(snapshotPath, `HANDOFF_CONTEXT ${JSON.stringify(context)}\n`);
    const notes = path.join(repo, '.local/source-library/research-notes.md');
    fs.appendFileSync(notes, 'changed private decision');
    assert.throws(() => verifyHandoffSnapshot(snapshotPath, buildHandoffContext(repo)), /漂移/);
    fs.rmSync(notes);
    assert.throws(() => buildHandoffContext(repo));
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('content changes in an already untracked file change the workspace fingerprint', () => {
  const { fixtureRoot, repo } = createFixture();
  try {
    const extra = path.join(repo, 'uncommitted-note.md');
    fs.writeFileSync(extra, 'first\n');
    const first = buildHandoffContext(repo);
    fs.writeFileSync(extra, 'second\n');
    const second = buildHandoffContext(repo);
    assert.notEqual(second.workspaceFingerprint, first.workspaceFingerprint);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
