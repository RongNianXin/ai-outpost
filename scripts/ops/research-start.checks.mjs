import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadResearchContext } from './research-start.mjs';
test('missing, empty, corrupted or duplicate library fails before research', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outpost-source-check-'));
  try {
    assert.throws(() => loadResearchContext(root));
    const dir = path.join(root, 'docs/source-library'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'README.md'), 'guide');
    fs.writeFileSync(path.join(dir, 'catalog.json'), '{broken');
    assert.throws(() => loadResearchContext(root));
    fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify({ entries: [] }));
    assert.throws(() => loadResearchContext(root));
    const e = { id: 'test', kind: 'vendor', access: 'readable', entryUrl: 'https://example.com/', sensitivity: { scope: 'limited' } };
    fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify({ entries: [e, e] }));
    assert.throws(() => loadResearchContext(root));
    fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify({ entries: [e] }));
    const a = loadResearchContext(root);
    assert.equal(a.catalog.entries[0].id, 'test');
    fs.appendFileSync(path.join(dir, 'README.md'), ' revised');
    assert.notEqual(loadResearchContext(root).fingerprint, a.fingerprint);
  } finally {
    const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(root));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Unsafe fixture path');
    fs.rmSync(root, { recursive: true, force: true });
  }
});
