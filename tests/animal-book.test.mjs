import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMAL_BOOK_PAGES, ANIMAL_BOOK_ANIMALS, ANIMAL_BOOK_AUDIO, ANIMAL_BOOK_CLIPS, ANIMAL_BOOK_STORAGE_KEY, animalBookPageIndex, normalizeAnimalBookPreferences, loadAnimalBookPreferences, saveAnimalBookPreferences, nextAnimalBookTarget, buildAnimalQuiz, animalQuizStars, nextAnimalQuizLevel, ANIMAL_QUIZ_LENGTH, ANIMAL_QUIZ_CHOICES } from '../animal-book-data.js';
import { createAnimalBookPlayback, animalAnswerSteps } from '../animal-book-game.js';

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
  for (const animal of ANIMAL_BOOK_ANIMALS) assert.equal(ANIMAL_BOOK_CLIPS[`abk_name_${animal.id}`], animal.label);
  assert.ok(ANIMAL_BOOK_CLIPS.abk_sound_guide && ANIMAL_BOOK_CLIPS.abk_scene_guide);
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
  assert.deepEqual(loadAnimalBookPreferences(storage), { pageId: 'farm', markersVisible: true, quizLevel: 1 });
  assert.equal(saveAnimalBookPreferences(storage, { pageId: 'forest', markersVisible: false, attempts: 999 }), true);
  assert.deepEqual(loadAnimalBookPreferences(storage), { pageId: 'forest', markersVisible: false, quizLevel: 1 });
  assert.deepEqual(JSON.parse(memory.get(ANIMAL_BOOK_STORAGE_KEY)), { pageId: 'forest', markersVisible: false, quizLevel: 1 });
  assert.equal(memory.get('unrelated.progress'), 'keep this'); assert.equal(memory.size, 2);
  for (const value of [null, [], 'broken', { pageId: 'unknown', markersVisible: 'no' }, { pageId: 3, markersVisible: 0 }]) assert.deepEqual(normalizeAnimalBookPreferences(value), { pageId: 'farm', markersVisible: true, quizLevel: 1 });
  memory.set(ANIMAL_BOOK_STORAGE_KEY, '{broken'); assert.deepEqual(loadAnimalBookPreferences(storage), { pageId: 'farm', markersVisible: true, quizLevel: 1 });
  const denied = { getItem() { throw new Error('storage denied'); }, setItem() { throw new Error('quota exceeded'); } };
  assert.deepEqual(loadAnimalBookPreferences(denied), { pageId: 'farm', markersVisible: true, quizLevel: 1 }); assert.equal(saveAnimalBookPreferences(denied, { pageId: 'pond' }), false);
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

function seeded(seed) {
  let value = seed;
  return () => { value = (value * 1103515245 + 12345) % 2147483648; return value / 2147483648; };
}

test('page tasks pick random animals of the page and never repeat the previous target', () => {
  for (const page of ANIMAL_BOOK_PAGES) {
    const random = seeded(7), seen = new Set();
    let previous = null;
    for (let i = 0; i < 60; i++) {
      const next = nextAnimalBookTarget(page.animals, previous, random);
      assert.ok(page.animals.some(animal => animal.id === next));
      assert.notEqual(next, previous);
      seen.add(next); previous = next;
    }
    assert.equal(seen.size, 3, `${page.id}: every animal is asked`);
  }
  // The old fixed cycle (cow, horse, sheep, cow …) must not come back.
  const orders = new Set();
  for (let seed = 1; seed < 30; seed++) {
    const random = seeded(seed); let previous = null; const order = [];
    for (let i = 0; i < 4; i++) { previous = nextAnimalBookTarget(ANIMAL_BOOK_PAGES[0].animals, previous, random); order.push(previous); }
    orders.add(order.join());
  }
  assert.ok(orders.size > 3);
});

test('Állatkvíz asks five different animals from all pages with 3 then 4 picture choices', () => {
  assert.equal(ANIMAL_QUIZ_LENGTH, 5); assert.deepEqual([...ANIMAL_QUIZ_CHOICES], [3, 3, 4, 4, 4]);
  const targets = new Set(), pagesUsed = new Set();
  for (let seed = 1; seed < 80; seed++) {
    const quiz = buildAnimalQuiz(seeded(seed));
    assert.equal(quiz.length, 5);
    assert.equal(new Set(quiz.map(item => item.targetId)).size, 5, 'targets do not repeat inside a round');
    quiz.forEach((item, index) => {
      assert.equal(item.choices.length, ANIMAL_QUIZ_CHOICES[index]);
      assert.equal(new Set(item.choices).size, item.choices.length);
      assert.ok(item.choices.includes(item.targetId));
      for (const id of item.choices) {
        assert.ok(ANIMAL_BOOK_ANIMALS.some(animal => animal.id === id));
        pagesUsed.add(ANIMAL_BOOK_PAGES.find(page => page.animals.some(animal => animal.id === id)).id);
      }
      targets.add(item.targetId);
    });
  }
  assert.equal(targets.size, 12, 'every animal of the book can be asked');
  assert.equal(pagesUsed.size, 4);
  const first = buildAnimalQuiz(seeded(3))[0].targetId;
  assert.notEqual(buildAnimalQuiz(seeded(3), first)[0].targetId, first, 'a new round does not open with the same animal');
});

test('quiz stars count first-try answers and a strong round unlocks the nameless level', () => {
  assert.equal(animalQuizStars(5), 5); assert.equal(animalQuizStars(3), 3);
  assert.equal(animalQuizStars(0), 1, 'finishing the quiz always earns one star');
  assert.equal(animalQuizStars(9), 5); assert.equal(animalQuizStars('x'), 1);
  assert.equal(nextAnimalQuizLevel(1, 3), 1); assert.equal(nextAnimalQuizLevel(1, 4), 2); assert.equal(nextAnimalQuizLevel(2, 0), 2);
  assert.equal(normalizeAnimalBookPreferences({ quizLevel: 2 }).quizLevel, 2);
  assert.equal(normalizeAnimalBookPreferences({ quizLevel: 3 }).quizLevel, 1);
});

test('answers have animal audio: a right pick names and sounds it, a wrong pick contrasts with the target', () => {
  assert.deepEqual(animalAnswerSteps({ mode: 'quiz', chosenId: 'cow', targetId: 'cow' }), [['name', 'cow'], ['sound', 'cow']]);
  assert.deepEqual(animalAnswerSteps({ mode: 'sound', chosenId: 'dog', targetId: 'cow' }), [['sound', 'dog'], ['sound', 'cow']]);
  assert.deepEqual(animalAnswerSteps({ mode: 'quiz', chosenId: 'wolf', targetId: 'owl' }), [['sound', 'wolf'], ['sound', 'owl']]);
  assert.deepEqual(animalAnswerSteps({ mode: 'scene', chosenId: 'frog', targetId: 'duck' }), [['sound', 'frog'], ['name', 'duck']], 'the picture search repeats the name it asked for');
  for (const animal of ANIMAL_BOOK_ANIMALS) assert.ok(ANIMAL_BOOK_CLIPS[`abk_name_${animal.id}`], 'every named answer has a recorded name');
});
