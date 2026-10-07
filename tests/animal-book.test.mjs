import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMAL_BOOK_PAGES, ANIMAL_BOOK_ANIMALS, ANIMAL_BOOK_AUDIO, ANIMAL_BOOK_STORAGE_KEY, animalBookPageIndex, normalizeAnimalBookPreferences, loadAnimalBookPreferences, saveAnimalBookPreferences } from '../animal-book-data.js';
import { createAnimalBookPlayback } from '../animal-book-game.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function controlledPlayback() {
  const sounds = [], changes = [];
  let stops = 0, allowed = true;
  const playback = createAnimalBookPlayback({
    playSound(id, { onStart }) { const sound = { id, onStart, ...deferred() }; sounds.push(sound); return sound.promise; },
    stopPlayback() { stops++; }, onChange(state) { changes.push(state); }, isAllowed: () => allowed,
  });
  return { playback, sounds, changes, get stops() { return stops; }, set allowed(value) { allowed = value; } };
}

test('the illustrated book has four ordered places, three animals each and twelve unique sound files', () => {
  assert.deepEqual(ANIMAL_BOOK_PAGES.map(page => page.id), ['farm', 'garden', 'pond', 'forest']);
  assert.deepEqual(ANIMAL_BOOK_PAGES.map(page => page.animals.map(animal => animal.id)), [['cow', 'horse', 'sheep'], ['dog', 'cat', 'chicken'], ['duck', 'frog', 'goose'], ['owl', 'cuckoo', 'wolf']]);
  assert.equal(ANIMAL_BOOK_ANIMALS.length, 12);
  assert.equal(new Set(ANIMAL_BOOK_ANIMALS.map(animal => animal.id)).size, 12);
  assert.equal(new Set(Object.values(ANIMAL_BOOK_AUDIO)).size, 12);
  for (const page of ANIMAL_BOOK_PAGES) {
    assert.equal(page.image, `./assets/animal-book/${page.id}.webp`);
    assert.ok(page.title && page.subtitle); assert.match(page.accent, /^#[0-9a-f]{6}$/i); assert.match(page.tint, /^#[0-9a-f]{6}$/i);
    for (const animal of page.animals) {
      assert.ok(animal.label && animal.emoji);
      assert.equal(ANIMAL_BOOK_AUDIO[animal.id], `./audio/animals/${animal.id}.mp3`);
      assert.ok([animal.x, animal.y, animal.width, animal.height].every(Number.isFinite));
      assert.ok(animal.x >= 0 && animal.y >= 0 && animal.width > 0 && animal.height > 0);
      assert.ok(animal.x + animal.width <= 100 && animal.y + animal.height <= 100, `${page.id}:${animal.id} fits the complete picture`);
    }
    const centers = page.animals.map(animal => [animal.x + animal.width / 2, animal.y + animal.height / 2]);
    assert.equal(new Set(centers.map(center => center.join(':'))).size, 3);
  }
  // File existence is verified by the integrated build after artwork and audio generation.
});

test('last-page and marker preferences are device-local and tolerate corrupt or unavailable storage', () => {
  const memory = new Map([['unrelated.progress', 'keep this']]);
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  assert.deepEqual(loadAnimalBookPreferences(storage), { pageId: 'farm', markersVisible: true });
  assert.equal(saveAnimalBookPreferences(storage, { pageId: 'forest', markersVisible: false, attempts: 999 }), true);
  assert.deepEqual(loadAnimalBookPreferences(storage), { pageId: 'forest', markersVisible: false });
  assert.deepEqual(JSON.parse(memory.get(ANIMAL_BOOK_STORAGE_KEY)), { pageId: 'forest', markersVisible: false });
  assert.equal(memory.get('unrelated.progress'), 'keep this'); assert.equal(memory.size, 2);
  for (const value of [null, [], 'broken', { pageId: 'unknown', markersVisible: 'no' }, { pageId: 3, markersVisible: 0 }]) assert.deepEqual(normalizeAnimalBookPreferences(value), { pageId: 'farm', markersVisible: true });
  memory.set(ANIMAL_BOOK_STORAGE_KEY, '{broken'); assert.deepEqual(loadAnimalBookPreferences(storage), { pageId: 'farm', markersVisible: true });
  const denied = { getItem() { throw new Error('storage denied'); }, setItem() { throw new Error('quota exceeded'); } };
  assert.deepEqual(loadAnimalBookPreferences(denied), { pageId: 'farm', markersVisible: true }); assert.equal(saveAnimalBookPreferences(denied, { pageId: 'pond' }), false);
  assert.equal(saveAnimalBookPreferences(null, {}), false);
  for (let index = 0; index < ANIMAL_BOOK_PAGES.length; index++) assert.equal(animalBookPageIndex(ANIMAL_BOOK_PAGES[index].id), index);
  assert.equal(animalBookPageIndex('bad'), 0);
});

test('sound animation begins at actual sound onset and ends when the sound promise settles', async () => {
  const control = controlledPlayback(), playing = control.playback.play('cow');
  assert.deepEqual(control.playback.getState(), { animalId: 'cow', loading: true, playing: false, error: false });
  assert.equal(control.stops, 1);
  control.sounds[0].onStart();
  assert.deepEqual(control.playback.getState(), { animalId: 'cow', loading: false, playing: true, error: false });
  const changeCount = control.changes.length; control.sounds[0].onStart(); assert.equal(control.changes.length, changeCount, 'duplicate audio starts do not announce twice');
  control.sounds[0].resolve(true); assert.equal(await playing, true);
  assert.deepEqual(control.playback.getState(), { animalId: 'cow', loading: false, playing: false, error: false });
  control.sounds[0].onStart(); assert.equal(control.playback.getState().playing, false, 'a callback arriving after the sound ended cannot restart the glow');
});

test('another animal replaces playback and ignores late starts, completions and failures from the previous sound', async () => {
  const control = controlledPlayback(), first = control.playback.play('cow'); control.sounds[0].onStart();
  const second = control.playback.play('horse'); assert.equal(control.stops, 2);
  assert.deepEqual(control.playback.getState(), { animalId: 'horse', loading: true, playing: false, error: false });
  control.sounds[0].onStart(); control.sounds[0].reject(new Error('old file cancelled')); assert.equal(await first, false);
  assert.deepEqual(control.playback.getState(), { animalId: 'horse', loading: true, playing: false, error: false });
  control.sounds[1].onStart(); control.sounds[1].resolve(true); assert.equal(await second, true);
  assert.equal(control.playback.getState().animalId, 'horse'); assert.equal(control.playback.getState().error, false);
});

test('page changes, hiding and leaving immediately cancel the indication and invalidate pending audio callbacks', async () => {
  for (const started of [false, true]) {
    const control = controlledPlayback(), playing = control.playback.play('frog');
    if (started) control.sounds[0].onStart();
    control.playback.stop(); assert.equal(control.stops, 2);
    assert.deepEqual(control.playback.getState(), { animalId: null, loading: false, playing: false, error: false });
    control.allowed = false; control.sounds[0].onStart(); control.sounds[0].resolve(true); assert.equal(await playing, false);
    assert.deepEqual(control.playback.getState(), { animalId: null, loading: false, playing: false, error: false });
    assert.equal(await control.playback.play('duck'), false); assert.equal(control.sounds.length, 1);
    control.allowed = true; const resumed = control.playback.play('goose'); control.sounds[1].onStart(); control.sounds[1].resolve(true); assert.equal(await resumed, true);
  }
});

test('false results and rejected files produce a recoverable error without stuck loading or animation', async () => {
  for (const rejected of [false, true]) {
    const control = controlledPlayback(), playing = control.playback.play('owl');
    if (rejected) control.sounds[0].reject(new Error('missing file')); else control.sounds[0].resolve(false);
    assert.equal(await playing, false);
    assert.deepEqual(control.playback.getState(), { animalId: 'owl', loading: false, playing: false, error: true });
    const retry = control.playback.play('owl'); control.sounds[1].onStart(); control.sounds[1].resolve(true); assert.equal(await retry, true); assert.equal(control.playback.getState().error, false);
  }
  const instant = createAnimalBookPlayback({ playSound: () => false, stopPlayback() {} });
  assert.equal(await instant.play('cat'), false); assert.equal(instant.getState().error, true);
  const thrown = createAnimalBookPlayback({ playSound() { throw new Error('audio unavailable'); }, stopPlayback() {} });
  assert.equal(await thrown.play('dog'), false); assert.equal(thrown.getState().playing, false);
});

test('unknown ids never reach playback and returned state cannot mutate the sound lifecycle', async () => {
  const control = controlledPlayback(); assert.equal(await control.playback.play('../bad'), false);
  assert.equal(control.sounds.length, 0); assert.equal(control.stops, 0);
  const playing = control.playback.play('wolf'); const copied = control.playback.getState(); copied.playing = true; copied.animalId = 'cow';
  assert.equal(control.playback.getState().playing, false); assert.equal(control.playback.getState().animalId, 'wolf');
  control.sounds[0].onStart(); control.sounds[0].resolve(true); assert.equal(await playing, true);
});
