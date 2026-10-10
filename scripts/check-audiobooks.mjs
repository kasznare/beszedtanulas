import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AUDIOBOOKS } from '../audiobook-data.js';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const catalog = JSON.parse(await read('content/stories/catalog.json'));
const receipts = JSON.parse(await read('audio/audiobooks/generated.json'));
const voice = JSON.parse(await read('audio/voice/manifest.json'));
assert.equal(receipts.voice, voice.voice);
assert.equal(receipts.rate, voice.rate);
assert.equal(AUDIOBOOKS.length, catalog.stories.length);
assert.equal(new Set(AUDIOBOOKS.map(story => story.id)).size, AUDIOBOOKS.length);
for (const story of AUDIOBOOKS) {
  const entry = catalog.stories.find(entry => entry.id === story.id);
  assert.ok(entry, `Unknown story: ${story.id}`);
  const source = await read(`content/stories/${entry.file}`);
  assert.equal(hash(source), entry.sha256, `Changed source: ${story.id}`);
  const text = source.toString().replace(/\*\*/g, '').replace(/^#{1,6}\s+/gm, '').trim();
  assert.equal(story.text, text, `Changed spoken story: ${story.id}`);
  assert.equal(story.title, entry.title);
  const receipt = receipts.stories[story.id];
  assert.equal(receipt.fingerprint, hash(JSON.stringify([voice.voice, voice.rate, `${story.title}.\n\n${text}`])), `Stale recording: ${story.id}`);
  const audio = await read(story.file);
  assert.equal(hash(audio), story.sha256);
  assert.equal(receipt.sha256, story.sha256);
  assert.equal(receipt.sourceSha256, entry.sha256);
  assert.equal(story.bytes, audio.length);
  assert.equal(story.duration, receipt.duration);
  assert.ok(story.duration > 60 && receipt.spokenWords >= text.split(/\s+/).length * .75);
}
console.log(`Audiobooks ready: ${AUDIOBOOKS.length} verified MP3s, ${Math.round(AUDIOBOOKS.reduce((sum, story) => sum + story.duration, 0) / 60)} minutes.`);
