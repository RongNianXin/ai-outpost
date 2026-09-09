import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadResearchContext } from './research-start.mjs';

export const REQUIRED_HANDOFF_FILES = [
  'AGENTS.md',
  'package.json',
  'task_plan.md',
  'findings.md',
  'progress.md',
  'docs/WORKFLOW.md',
  'docs/CONTENT-OPS.md',
  'docs/FACT-CHECK-PROTOCOL.md',
  'docs/PROMOTION.md',
  'docs/WEEKLY-TASK-PROMPT.md',
  'docs/source-library/README.md',
  'docs/source-library/catalog.json',
  'ops/weekly-run-state.json',
  'scripts/ops/check-handoff-context.mjs',
  'scripts/ops/check-weekly.mjs',
  'scripts/ops/research-start.mjs',
  'scripts/ops/check-source-privacy.mjs',
  'docs/source-library/PRIVACY-MIGRATION.md',
];

function normalize(value) {
  return value.replaceAll('\r\n', '\n').trimEnd();
}

function git(root, args) {
  return normalize(execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }));
}

function optionalFingerprint(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function changedFiles(root) {
  const commands = [
    ['diff', '--name-only', '-z'],
    ['diff', '--cached', '--name-only', '-z'],
    ['ls-files', '--others', '--exclude-standard', '-z'],
  ];
  const paths = new Set(commands.flatMap((args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).split('\0').filter(Boolean)));
  return [...paths].sort().map((relativePath) => ({ path: relativePath, sha256: optionalFingerprint(path.join(root, relativePath)) }));
}

function readAutomationState(automationPath) {
  if (!automationPath || !fs.existsSync(automationPath)) return { exists: false };
  const content = fs.readFileSync(automationPath, 'utf8');
  const value = (key) => content.match(new RegExp(`^${key} = "([^"]*)"`, 'm'))?.[1] ?? null;
  return {
    exists: true,
    status: value('status'),
    rrule: value('rrule'),
    targetThreadConfigured: Boolean(value('target_thread_id')),
    fingerprint: createHash('sha256').update(content).digest('hex'),
  };
}

export function buildHandoffContext(root, { automationPath = null } = {}) {
  const files = REQUIRED_HANDOFF_FILES.map((relativePath) => {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) throw new Error(`交接必需文件缺失：${relativePath}`);
    const content = fs.readFileSync(absolutePath);
    if (!content.length) throw new Error(`交接必需文件为空：${relativePath}`);
    return { path: relativePath, sha256: createHash('sha256').update(content).digest('hex') };
  });

  const ignoredRequired = REQUIRED_HANDOFF_FILES.filter((relativePath) => spawnSync('git', ['-C', root, 'check-ignore', '--quiet', '--', relativePath]).status === 0);
  if (ignoredRequired.length) throw new Error(`交接必需文件被Git忽略：${ignoredRequired.join(', ')}`);

  const research = loadResearchContext(root);
  const workspaceChanges = changedFiles(root);
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    branch: git(root, ['branch', '--show-current']),
    head: git(root, ['rev-parse', 'HEAD']),
    gitStatus: git(root, ['status', '--short', '--untracked-files=all']),
    files,
    contextFingerprint: createHash('sha256').update(JSON.stringify(files)).digest('hex'),
    workspaceChanges,
    workspaceFingerprint: createHash('sha256').update(JSON.stringify(workspaceChanges)).digest('hex'),
    sourceLibraryFingerprint: research.fingerprint,
    localIndexFingerprint: optionalFingerprint(path.join(root, '.local/AI状态索引.md')),
    automation: readAutomationState(automationPath),
  };
}

export function verifyHandoffSnapshot(snapshotPath, current) {
  const snapshot = fs.readFileSync(snapshotPath, 'utf8');
  const match = snapshot.match(/^HANDOFF_CONTEXT (\{.*\})$/m);
  if (!match) throw new Error('交接快照缺少 HANDOFF_CONTEXT 清单');
  const recorded = JSON.parse(match[1]);
  const fields = ['schemaVersion', 'branch', 'head', 'gitStatus', 'contextFingerprint', 'workspaceFingerprint', 'sourceLibraryFingerprint', 'localIndexFingerprint'];
  const changed = fields.filter((field) => recorded[field] !== current[field]);
  if (changed.length) throw new Error(`交接快照已漂移：${changed.join(', ')}`);
  if (JSON.stringify(recorded.files) !== JSON.stringify(current.files)) throw new Error('交接快照文件清单已漂移');
  if (JSON.stringify(recorded.workspaceChanges) !== JSON.stringify(current.workspaceChanges)) throw new Error('交接快照未提交文件已漂移');
  if (JSON.stringify(recorded.automation) !== JSON.stringify(current.automation)) throw new Error('交接快照自动任务配置已漂移');
  return recorded;
}

function main() {
  const snapshotIndex = process.argv.indexOf('--snapshot');
  if (process.argv.includes('--check') && snapshotIndex < 0) throw new Error('检查模式必须提供 --snapshot <快照绝对路径>');
  if (snapshotIndex >= 0 && (!process.argv[snapshotIndex + 1] || process.argv[snapshotIndex + 1].startsWith('--'))) {
    throw new Error('--snapshot 需要文件路径');
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const automationPath = path.join(codexHome, 'automations/ai-outpost/automation.toml');
  const context = buildHandoffContext(root, { automationPath });
  if (snapshotIndex >= 0) {
    const snapshotPath = process.argv[snapshotIndex + 1];
    if (!snapshotPath) throw new Error('--snapshot 需要文件路径');
    verifyHandoffSnapshot(path.resolve(snapshotPath), context);
    console.log(`HANDOFF_CONTEXT_OK ${context.contextFingerprint}`);
    return;
  }
  console.log(`HANDOFF_CONTEXT ${JSON.stringify(context)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`交接上下文检查失败：${error.message}`);
    process.exitCode = 1;
  }
}
