import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { checkPublicText, resolvePrivateSourceLibrary } from './check-source-privacy.mjs';
test('public template stays empty and private data cannot be published as a tracked file', () => {
  assert.deepEqual(checkPublicText('docs/source-library/catalog.json', '{"entries":[]}'), []);
  assert.deepEqual(checkPublicText('docs/source-library/catalog.json', '{"entries":[{}]}'), ['nonempty-public-catalog']);
  assert.deepEqual(checkPublicText('.local/source-library/notes.md', 'data'), ['private-path']);
  assert.deepEqual(checkPublicText('docs/note.md', 'internal.example/research', ['internal.example/research']), ['private-source-detail']);
});

test('isolated worktrees can use an explicitly configured read-only private library', () => {
  const root = path.join(path.parse(process.cwd()).root, 'workspace', 'isolated-worktree');
  const externalLibrary = path.join(path.parse(process.cwd()).root, 'workspace', 'source-library');
  assert.equal(
    resolvePrivateSourceLibrary(root, { AI_OUTPOST_PRIVATE_SOURCE_LIBRARY_DIR: externalLibrary }),
    path.join(externalLibrary, 'catalog.json'),
  );
  assert.equal(
    resolvePrivateSourceLibrary(root, {}),
    path.join(root, '.local', 'source-library', 'catalog.json'),
  );
});
