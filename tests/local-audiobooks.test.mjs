import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parsePrivateAudiobook } from '../local-audiobooks.js';
import { loadAudiobookPreferences } from '../audiobook-player.js';

const bytes = Buffer.from('synthetic audio fixture');
const sha256 = createHash('sha256').update(bytes).digest('hex');
const fixture = () => ({ format: 'beszedtanulas-private-audiobook', version: 1,
  story: { title: 'Saját mese', text: 'Egy szöveg.\nMásodik sor.', duration: 10, bytes: bytes.length, sha256 },
  audio: { mime: 'audio/mpeg', base64: bytes.toString('base64') } });
const file = value => new Blob([JSON.stringify(value)], { type: 'application/json' });

test('private import uses verified embedded bytes and ignores external sources or identifiers', async () => {
  const value = fixture();
  value.story.id = 'story-01'; value.story.file = 'https://example.com/tracker'; value.story.emoji = '<img src=x>';
  const story = await parsePrivateAudiobook(file(value));
  assert.equal(story.id, `local-${sha256}`); assert.equal(story.file, undefined);
  assert.equal(story.emoji, '📖'); assert.equal(story.local, true);
  assert.equal(story.audio.type, 'audio/mpeg');
  assert.deepEqual(Buffer.from(await story.audio.arrayBuffer()), bytes);
});
test('corrupt, incompatible or oversized local imports are rejected before storage', async () => {
  const mutations = [
    value => { value.version = 2; },
    value => { value.story.bytes++; },
    value => { value.story.sha256 = '0'.repeat(64); },
    value => { value.audio.base64 = '!'; },
    value => { value.audio.mime = 'text/html'; },
    value => { value.story.duration = -1; },
    value => { value.story.title = ''; },
    value => { value.story.text = 'a'.repeat(100001); },
  ];
  for (const mutate of mutations) { const value = fixture(); mutate(value); await assert.rejects(parsePrivateAudiobook(file(value))); }
  await assert.rejects(parsePrivateAudiobook(new Blob(['not JSON'])));
  await assert.rejects(parsePrivateAudiobook({ size: 47 * 1024 * 1024, text() { throw Error('Must not read oversized file'); } }));
});
test('local selection and bookmarks survive preference loading with the combined catalogue', () => {
  const id = `local-${sha256}`, stories = [{ id, sha256, duration: 10 }];
  const saved = { selected: id, positions: { [id]: { seconds: 4, sha256 } } };
  assert.deepEqual(loadAudiobookPreferences({ getItem: () => JSON.stringify(saved) }, stories), saved);
});
