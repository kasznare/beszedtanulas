import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudiobookPlayer, resolveAudiobookSource } from '../audiobook-player.js';

const stories = [{ id: 'a', duration: 300, sha256: 'hash-a' }, { id: 'b', duration: 400, sha256: 'hash-b' }];
class Media extends EventTarget {
  paused = true; ended = false; currentTime = 0; duration = 300; error = null; loads = 0; plays = 0;
  setAttribute() {} removeAttribute() {}
  load() { this.loads++; this.error = null; }
  pause() { this.paused = true; }
  play() { this.plays++; return this.failure ? Promise.reject(this.failure) : Promise.resolve(); }
  fire(type) { this.dispatchEvent(new Event(type)); }
}
async function fixture(source = { url: 'blob:local', fallbackUrl: 'https://example.test/a.mp3?playback=hash-a' }) {
  const media = [];
  const player = createAudiobookPlayer({ stories, preferences: { selected: 'a', positions: { a: { seconds: 65, sha256: 'hash-a' } } },
    resolveSource: async () => source, releaseSource() {}, audioFactory: () => { const item = new Media(); media.push(item); return item; } });
  await player.select('a');
  return { player, audio: media[0], media };
}
for (const [name, kind] of [['NotAllowedError', 'not-allowed'], ['AbortError', 'interrupted'], ['NotSupportedError', 'unsupported'], ['Error', 'playback']]) {
  test(`${name} rejection is classified as ${kind}`, async () => {
    const { player, audio } = await fixture(); audio.failure = Object.assign(new Error(name), { name });
    assert.equal(await player.play(), false); assert.equal(player.getState().errorKind, kind);
  });
}
for (const name of ['NotAllowedError', 'AbortError']) test(`${name} retries synchronously without replacing or loading source`, async () => {
  const { player, audio } = await fixture(); audio.failure = Object.assign(new Error(name), { name }); await player.play();
  audio.failure = null; const result = player.play();
  assert.equal(audio.plays, 2); assert.equal(audio.loads, 0); assert.equal(audio.src, 'blob:local'); assert.equal(await result, true);
});
for (const [code, kind] of [[2, 'network'], [3, 'decode'], [4, 'unsupported']]) test(`${kind} retries direct source only on explicit play and restores bookmark`, async () => {
  const { player, audio } = await fixture(); audio.fire('loadedmetadata'); assert.equal(audio.currentTime, 65);
  audio.error = { code }; audio.fire('error');
  assert.equal(player.getState().errorKind, kind); assert.equal(audio.src, 'blob:local'); assert.equal(audio.plays, 0);
  const attempt = player.play(); assert.equal(audio.plays, 1); assert.equal(audio.loads, 0); assert.match(audio.src, /\?playback=hash-a$/);
  assert.equal(player.getState().metadata, false); audio.currentTime = 0; audio.fire('loadedmetadata');
  assert.equal(audio.currentTime, 65); assert.equal(await attempt, true);
});
test('private source retries stay local', async () => {
  const { player, audio } = await fixture({ url: 'blob:private', blob: true }); audio.error = { code: 3 }; audio.fire('error');
  await player.play(); assert.equal(audio.src, 'blob:private'); assert.equal(audio.loads, 1);
});
for (const mode of ['throw', 'reject']) test(`offline onPlay ${mode} cannot fail audio playback`, async () => {
  const { player } = await fixture({ url: 'local.mp3', onPlay() { if (mode === 'throw') throw Error('storage'); return Promise.reject(Error('storage')); } });
  assert.equal(await player.play(), true); await new Promise(resolve => setImmediate(resolve)); assert.notEqual(player.getState().phase, 'error');
});
test('late rejection and media error from old story cannot change new story', async () => {
  const { player, audio, media } = await fixture(); let reject;
  audio.play = () => new Promise((_, fail) => { reject = fail; }); const attempt = player.play();
  await player.select('b'); reject(Object.assign(Error('old'), { name: 'NotAllowedError' }));
  assert.equal(await attempt, false); audio.error = { code: 3 }; audio.fire('error');
  assert.equal(player.getState().storyId, 'b'); assert.equal(player.getState().phase, 'ready'); assert.equal(media.length, 2);
});
test('public sources normalize cached MPEG and retain direct hash-busted retry URL', async () => {
  const originalCaches = globalThis.caches, originalCreate = URL.createObjectURL; let captured;
  try {
    URL.createObjectURL = blob => { captured = blob; return 'blob:normalized'; };
    globalThis.caches = { open: async () => ({ match: async () => new Response('mp3', { headers: { 'Content-Type': 'audio/mp3' } }) }) };
    const story = { file: 'audio/audiobooks/a.mp3', sha256: 'hash-a' };
    const cached = await resolveAudiobookSource(story);
    assert.equal(captured.type, 'audio/mpeg'); assert.equal(cached.blob, true); assert.equal(cached.url, 'blob:normalized');
    const fallback = new URL(cached.fallbackUrl); assert.equal(fallback.searchParams.get('playback'), 'hash-a'); assert.equal(fallback.searchParams.has('v'), false);
    globalThis.caches = { open: async () => ({ match: async () => undefined }) };
    const uncached = await resolveAudiobookSource(story); assert.equal(uncached.fallbackUrl, cached.fallbackUrl);
    assert.equal(new URL(uncached.url).searchParams.get('v'), 'hash-a'); assert.equal(uncached.saveOnPlay, true);
  } finally { globalThis.caches = originalCaches; URL.createObjectURL = originalCreate; }
});
