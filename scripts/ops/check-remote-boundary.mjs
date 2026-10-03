import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const forbiddenRules = [
  [/^content\/issues\//, '每期事实稿、草稿和修订稿'],
  [/^content\/sources\.json$/, '按期来源清单'],
  [/^public\/images\/issues\//, '官网每期图片素材'],
  [/^exports\//, '平台派生稿和导出包'],
  [/^每一期底稿\//, '本机期刊底稿归档'],
  [/^out\//, '构建输出'],
  [/^自己写的文案\//, '作者私有文案'],
  [/^素材库\//, '本地素材库'],
  [/^ops\/runs\//, '按期运行记录'],
  [/^ops\/weekly-run-state\.json$/, '本机周更运行状态'],
  [/^(?:task_plan|findings|progress)\.md$/, '本机任务状态和研究记录'],
  [/^docs\/reviews\//, '按期审查和发布复盘'],
  [/^docs\/ISSUE-[^/]+\.md$/, '按期任务包'],
  [/^docs\/AI-CONTENT-MARKET-RESEARCH-[^/]+\.md$/, '研究素材和市场样本'],
];

export function classifyPath(file) {
  const normalized = file.replaceAll('\\', '/').replace(/^\.\//, '');
  const rule = forbiddenRules.find(([pattern]) => pattern.test(normalized));
  return rule ? { file: normalized, forbidden: true, reason: rule[1] } : { file: normalized, forbidden: false };
}

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
}

function changedFiles(root, args) {
  return git(root, args)
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

export function inspectPaths(files) {
  return files.map(classifyPath).filter((entry) => entry.forbidden);
}

function readMode(argv) {
  const staged = argv.includes('--staged');
  const commitIndex = argv.indexOf('--commit');
  const baseIndex = argv.indexOf('--base');
  if (staged && (commitIndex >= 0 || baseIndex >= 0)) throw new Error('只能选择一种检查范围。');
  if (staged) return { label: 'staged', args: ['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB'] };
  if (commitIndex >= 0) {
    const commit = argv[commitIndex + 1];
    if (!commit) throw new Error('--commit 需要提交号。');
    return { label: `commit:${commit}`, args: ['diff-tree', '--root', '--no-commit-id', '--name-only', '--diff-filter=ACMRTUXB', '-r', commit] };
  }
  if (baseIndex >= 0) {
    const base = argv[baseIndex + 1];
    if (!base) throw new Error('--base 需要 Git ref。');
    return { label: `base:${base}`, args: ['diff', '--name-only', '--diff-filter=ACMRTUXB', `${base}...HEAD`] };
  }
  throw new Error('请明确检查范围：--staged、--commit <sha> 或 --base <ref>。');
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const mode = readMode(process.argv.slice(2));
  const files = changedFiles(root, mode.args);
  const findings = inspectPaths(files);
  const result = { scope: mode.label, changedCount: files.length, findings };
  console.log(JSON.stringify(result, null, 2));
  if (findings.length) {
    console.error('远端边界检查失败：每期资料和生成物不得进入远端仓库；请移出暂存区，保留在本机或私有存储。');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(`Remote boundary check failed: ${error.message}`); process.exitCode = 1; }
}
