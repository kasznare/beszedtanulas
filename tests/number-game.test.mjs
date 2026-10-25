import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildNumberChoices, newNumberSession, normalizeNumberProgress, validateNumberProgress, numberWeights, pickNumberAmount, nextNumberObject, updateQuizDifficulty, numberStars, NUMBER_OBJECTS } from '../number-data.js';
import { VOICE_CLIPS } from '../voice-library.js';

const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test('counting amounts are random, never repeat the previous one and favour amounts still being learned', () => {
  const random = seeded(3);
  const stats = normalizeNumberProgress().stats.count;
  stats[1].independent = 6; stats[2].independent = 6; stats[5].helped = 3;
  const seen = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let previous = 0;
  for (let run = 0; run < 2000; run += 1) {
    const amount = pickNumberAmount(stats, 5, previous, random);
    assert.notEqual(amount, previous);
    assert.ok(amount >= 1 && amount <= 5);
    seen[amount] += 1; previous = amount;
  }
  assert.ok(seen[5] > seen[3] && seen[3] > seen[1], JSON.stringify(seen));
  assert.ok(seen[1] > 0, 'mastered amounts still come back sometimes');
  const weights = numberWeights(stats, 5);
  assert.ok(weights[4].weight > weights[2].weight && weights[2].weight > weights[0].weight);
  // A new session no longer always starts at three apples.
  const amounts = new Set(Array.from({ length: 40 }, () => newNumberSession('count', 10, 5, 0, random).amount));
  assert.ok(amounts.size > 3);
});

test('objects take turns between apple, ball and car', () => {
  assert.deepEqual(NUMBER_OBJECTS.map(nextNumberObject), ['labda', 'auto', 'alma']);
  assert.equal(newNumberSession('count', 5, 5, 0, Math.random, null, 'auto').objectId, 'auto');
  assert.equal(newNumberSession('count', 5, 5, 0, Math.random, null, 'bogus').objectId, 'alma');
});

test('"two different" quiz pictures use a random amount at least two apart, not always the farthest', () => {
  const random = seeded(8);
  const distractors = new Set();
  for (let run = 0; run < 200; run += 1) {
    const choices = buildNumberChoices(5, 10, 'wide', random);
    const other = choices.find(n => n !== 5);
    assert.ok(Math.abs(other - 5) >= 2);
    distractors.add(other);
  }
  assert.ok(distractors.size >= 4, [...distractors].join());
  // With only 1–3 there is no amount two apart from 2: any other amount is used.
  assert.equal(buildNumberChoices(2, 3, 'wide', () => .5).length, 2);
});

test('quiz difficulty follows the child: two clean answers go up, two missed ones come back', () => {
  let state = { difficulty: 'wide', streak: {} };
  state = updateQuizDifficulty(state.difficulty, state.streak, true);
  assert.equal(state.difficulty, 'wide');
  state = updateQuizDifficulty(state.difficulty, state.streak, true);
  assert.equal(state.difficulty, 'close');
  state = updateQuizDifficulty(state.difficulty, state.streak, false);
  state = updateQuizDifficulty(state.difficulty, state.streak, true);
  state = updateQuizDifficulty(state.difficulty, state.streak, false);
  assert.equal(state.difficulty, 'close', 'a clean answer breaks the miss streak');
  state = updateQuizDifficulty(state.difficulty, state.streak, false);
  assert.equal(state.difficulty, 'wide');
});

test('a self-counted task may wait on the "Hány van?" numerals, but forged answer states are rejected', () => {
  const base = normalizeNumberProgress();
  const waiting = { ...newNumberSession('count', 5, 3), amount: 3, counted: [0, 2, 1], choices: buildNumberChoices(3, 5, 'close', seeded(2)) };
  base.sessions.count = waiting;
  assert.doesNotThrow(() => validateNumberProgress(base));
  assert.deepEqual(normalizeNumberProgress(base).sessions.count.choices, waiting.choices);
  for (const patch of [{ counted: [0, 1] }, { choices: [1, 2] }, { choices: [] }, { clean: 2 }]) {
    const bad = structuredClone(base); Object.assign(bad.sessions.count, patch);
    assert.throws(() => validateNumberProgress(bad), JSON.stringify(patch));
    assert.doesNotThrow(() => validateNumberProgress(normalizeNumberProgress(bad)));
  }
  // Older saves without a clean counter still load.
  const legacy = structuredClone(base); delete legacy.sessions.count.clean;
  assert.doesNotThrow(() => validateNumberProgress(legacy));
});

test('number stars follow tasks solved without a mistake', () => {
  assert.equal(numberStars(5, 5), 5);
  assert.equal(numberStars(3, 5), 3);
  assert.equal(numberStars(0, 3), 1);
  assert.equal(numberStars(10, 10), 5);
});

test('the number game uses only recorded clips, gates Tovább and no longer ignores a changed round length', () => {
  const source = readFileSync(new URL('../number-game.js', import.meta.url), 'utf8');
  for (const [, id] of source.matchAll(/'((?:guide|counting)_[a-z_]+)'/g)) assert.ok(VOICE_CLIPS[id], id);
  assert.ok(VOICE_CLIPS.guide_retry_count && VOICE_CLIPS.counting_total);
  for (const object of NUMBER_OBJECTS) for (let n = 1; n <= 10; n += 1) assert.ok(VOICE_CLIPS[`quantity_${object}_${n}`]);
  assert.match(source, /if\(!session\.solved\)return;/);
  assert.match(source, /old\.length===length/);
  assert.doesNotMatch(source, /onComplete\(mode,session\.length\)/);
});
