import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AUDIOBOOKS } from '../audiobook-data.js';

const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const catalog = JSON.parse(await read('content/stories/catalog.json'));
const receipts = JSON.parse(await read('audio/audiobooks/generated.json'));
const provider = receipts.provider || 'edge-tts';
const voiceConfig = JSON.parse(await read('voice-config.json'));
assert.equal(provider, 'elevenlabs', 'Factory audiobooks must use Jessa');
if (provider === 'elevenlabs') {
  assert.equal(receipts.version, 2);
  for (const key of ['voice', 'voiceName', 'model', 'language', 'outputFormat']) {
    assert.ok(typeof receipts[key] === 'string' && receipts[key].length > 0, `Missing ElevenLabs ${key}`);
  }
  assert.equal(receipts.language, 'hu');
  assert.equal(receipts.voice, voiceConfig.voice_id);
  assert.equal(receipts.model, voiceConfig.model_id);
  assert.equal(receipts.outputFormat, voiceConfig.output_format);
  assert.equal(receipts.seed, voiceConfig.seed);
  assert.deepEqual(receipts.settings, voiceConfig.voice_settings);
  assert.ok(Number.isInteger(receipts.seed) && receipts.seed >= 0);
  assert.ok(receipts.settings && typeof receipts.settings === 'object');
  for (const key of ['stability', 'similarity_boost']) {
    assert.ok(Number.isFinite(receipts.settings[key]) && receipts.settings[key] >= 0 && receipts.settings[key] <= 1, `Invalid ElevenLabs ${key}`);
  }
} else {
  const voice = JSON.parse(await read('audio/voice/manifest.json'));
  assert.equal(receipts.voice, voice.voice);
  assert.equal(receipts.rate, voice.rate);
}
const readyCatalog = catalog.stories.filter(story => story.audioStatus !== 'pending');
const pronunciation = JSON.parse(await read('voice-pronunciation.json'));
const phonetic = text => text.replace(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu, word => {
  const ipa = pronunciation.words[word.toLocaleLowerCase('hu-HU')];
  return ipa ? `/${ipa}/` : word;
});
assert.equal(AUDIOBOOKS.length, readyCatalog.length);
assert.equal(new Set(AUDIOBOOKS.map(story => story.id)).size, AUDIOBOOKS.length);
assert.deepEqual(Object.keys(receipts.stories).sort(), readyCatalog.map(story => story.id).sort());
for (const story of AUDIOBOOKS) {
  const entry = catalog.stories.find(entry => entry.id === story.id);
  assert.ok(entry, `Unknown story: ${story.id}`);
  const source = await read(`content/stories/${entry.file}`);
  assert.equal(hash(source), entry.sha256, `Changed source: ${story.id}`);
  const text = source.toString().replace(/\*\*/g, '').replace(/^#{1,6}\s+/gm, '').trim();
  assert.equal(story.text, text, `Changed spoken story: ${story.id}`);
  assert.equal(story.title, entry.title);
  const receipt = receipts.stories[story.id];
  const displayed = receipt.schemaVersion === 3 ? `${story.title}\n\n${text}` : `${story.title}.\n\n${text}`;
  const spoken = receipt.schemaVersion === 3 ? phonetic(displayed) : displayed;
  const generation = receipt.schemaVersion === 3 ? [voiceConfig, spoken] : provider === 'elevenlabs'
    ? [receipts.voice, receipts.model, receipts.language, receipts.settings, receipts.outputFormat, receipts.seed, spoken]
    : [receipts.voice, receipts.rate, spoken];
  assert.equal(receipt.fingerprint, hash(JSON.stringify(generation)), `Stale recording: ${story.id}`);
  if (receipt.schemaVersion === 3) {
    assert.equal(receipt.displayTextSha256, hash(displayed));
    assert.equal(receipt.spokenTextSha256, hash(spoken));
    assert.equal(receipt.pronunciationSha256, hash(await read('voice-pronunciation.json')));
  }
  if (provider === 'elevenlabs') {
    assert.equal(receipt.characterCount, Array.from(spoken).length, `Changed character count: ${story.id}`);
    assert.ok(Number.isFinite(receipt.credits) && receipt.credits >= 0, `Invalid credit receipt: ${story.id}`);
  }
  assert.ok(Number.isInteger(receipt.parts) && receipt.parts > 0, `Missing audio parts: ${story.id}`);
  const audio = await read(story.file);
  assert.equal(hash(audio), story.sha256);
  assert.equal(receipt.sha256, story.sha256);
  assert.equal(receipt.sourceSha256, entry.sha256);
  assert.equal(story.bytes, audio.length);
  assert.equal(story.duration, receipt.duration);
  assert.ok(Number.isFinite(story.duration) && story.duration >= spoken.split(/\s+/).length / 5 && receipt.spokenWords >= text.split(/\s+/).length * .75);
}
console.log(`Audiobooks ready: ${AUDIOBOOKS.length} verified MP3s, ${Math.round(AUDIOBOOKS.reduce((sum, story) => sum + story.duration, 0) / 60)} minutes.`);
