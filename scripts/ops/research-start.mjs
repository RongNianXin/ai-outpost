import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

function privateFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.name !== '.git').sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => {
    const relative = prefix + e.name;
    const file = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw Error('Private library symlinks are not supported');
    return e.isDirectory() ? privateFiles(file, relative + '/') : [{ path: relative, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') }];
  });
}

export function loadResearchContext(root) {
  const dir = path.join(root, '.local/source-library');
  if (!fs.existsSync(path.join(dir, 'catalog.json'))) throw Error('Private research library missing; see docs/source-library/README.md');
  const publicGuide = fs.readFileSync(path.join(root, 'docs/source-library/README.md'), 'utf8');
  const guide = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
  const notes = fs.readFileSync(path.join(dir, 'research-notes.md'), 'utf8');
  const raw = fs.readFileSync(path.join(dir, 'catalog.json'), 'utf8');
  const catalog = JSON.parse(raw);
  if (!guide.trim() || !Array.isArray(catalog.entries) || !catalog.entries.length) throw Error('Empty research library');
  const ids = new Set();
  for (const e of catalog.entries) {
    if (!e.id || ids.has(e.id) || !e.kind || !e.access || !e.sensitivity?.scope) throw Error('Invalid/duplicate source');
    if (new URL(e.entryUrl).protocol !== 'https:') throw Error('Non-HTTPS source');
    ids.add(e.id);
  }
  if (!notes.trim() || !publicGuide.trim()) throw Error('Empty research guidance');
  return { guide: `${publicGuide}\n\n${guide}`, notes, catalog,
    fingerprint: createHash('sha256').update(publicGuide).update('\0').update(JSON.stringify(privateFiles(dir))).digest('hex') };
}
function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const context = loadResearchContext(root);
  // Emit the actual guide and records for the agent to read, not just a success flag.
  console.log(context.guide);
  console.log(JSON.stringify(context.catalog, null, 2));
  console.log(context.notes);
  const receipt = { loadedAt: new Date().toISOString(), fingerprint: context.fingerprint, entries: context.catalog.entries.length, scope: 'local_library_loaded_not_web_verification' };
  fs.mkdirSync(path.join(root, '.local'), { recursive: true });
  fs.writeFileSync(path.join(root, '.local/research-context.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log('RESEARCH_CONTEXT ' + JSON.stringify(receipt));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (e) { console.error('来源库加载失败，暂停检索：' + e.message); process.exitCode = 1; }
}
