import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPublicText } from './check-source-privacy.mjs';
test('public template stays empty and private data cannot be published as a tracked file', () => {
  assert.deepEqual(checkPublicText('docs/source-library/catalog.json', '{"entries":[]}'), []);
  assert.deepEqual(checkPublicText('docs/source-library/catalog.json', '{"entries":[{}]}'), ['nonempty-public-catalog']);
  assert.deepEqual(checkPublicText('.local/source-library/notes.md', 'data'), ['private-path']);
  assert.deepEqual(checkPublicText('docs/note.md', 'internal.example/research', ['internal.example/research']), ['private-source-detail']);
});
