import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function checkPublicText(file, text, terms = []) {
  if (file.startsWith('.local/') || file.startsWith('.private/')) return ['private-path'];
  const errors = [];
  if (file.startsWith('ops/runs/') && /"(?:candidates|rejectedCandidates)"\s*:/.test(text)) errors.push('internal-candidate-list');
  if (file === 'docs/source-library/catalog.json') {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data.entries) || data.entries.length) errors.push('nonempty-public-catalog');
    } catch { errors.push('invalid-public-template'); }
  }
  if (terms.some(term => text.includes(term))) errors.push('private-source-detail');
  return errors;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const catalogPath = path.join(root, '.local/source-library/catalog.json');
  if (!fs.existsSync(catalogPath)) throw Error('Private comparison library missing; full privacy audit unavailable');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const terms = catalog.entries.filter(e => ['media', 'community', 'research'].includes(e.kind))
    .flatMap(e => [e.entryUrl, ...(['media'].includes(e.kind) ? [e.name] : [])]);
  const findings = [];
  const files = new Set([...git(['ls-files', '-z']).split('\0'), ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0')].filter(Boolean));
  const inspect = (file, text, scope) => {
    for (const reason of checkPublicText(file, text, terms)) findings.push({ file, scope, reason });
  };
  for (const file of files) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    const bytes = fs.readFileSync(absolute);
    if (!bytes.includes(0)) inspect(file, bytes.toString('utf8'), 'worktree');
  }
  if (!process.argv.includes('--worktree-only')) {
    for (const file of git(['ls-files', '-z']).split('\0').filter(Boolean)) {
      const text = git(['show', `:${file}`]);
      if (!text.includes('\0')) inspect(file, text, 'index');
    }
  }
  console.log(JSON.stringify({ scope: process.argv.includes('--worktree-only') ? 'worktree_only_not_index_or_history' : 'worktree_and_index_not_history', findings }, null, 2));
  if (findings.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(`Privacy check failed: ${error.message}`); process.exitCode = 1; }
}
