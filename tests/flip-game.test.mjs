import assert from 'node:assert/strict';
import test from 'node:test';
import { words, wordCategories } from '../game-data.js';
import {
  buildKimQuestion, KIM_LEVELS, KIM_QUESTIONS, adaptKimLevel, nextKimStart, nextFindSize, FIND_SIZES, fillWordPool, roundStars, normalizeFlipLevels,
} from '../flip-game.js';

const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test('Kim questions remove the hidden cards, move the rest and mix in never-shown pictures', () => {
  for (const category of wordCategories) for (const level of KIM_LEVELS) for (let seed = 1; seed <= 20; seed++) {
    const pool = words.filter(word => category.words.includes(word.id));
    const question = buildKimQuestion(pool, words, level, seeded(seed));
    const shownIds = new Set(question.shown.map(word => word.id));
    assert.equal(question.shown.length, level.cards);
    assert.equal(shownIds.size, level.cards);
    assert.equal(question.hidden.length, level.hide);
    assert.ok(question.hidden.every(word => shownIds.has(word.id)));
    assert.equal(question.remaining.length, level.cards - level.hide);
    assert.ok(question.remaining.every(word => shownIds.has(word.id) && !question.hidden.includes(word)), 'hidden cards leave the board');
    const before = question.shown.filter(word => !question.hidden.includes(word)).map(word => word.id).join();
    if (question.remaining.length > 1) assert.notEqual(question.remaining.map(word => word.id).join(), before, 'the remaining cards move');
    assert.equal(question.options.length, level.hide + 2);
    assert.equal(new Set(question.options.map(word => word.id)).size, question.options.length);
    const never = question.options.filter(word => !shownIds.has(word.id));
    assert.equal(never.length, 2, 'two options were never on the board');
    assert.ok(question.hidden.every(word => question.options.includes(word)));
    assert.ok(!question.options.some(word => question.remaining.includes(word)), 'visible cards are not offered: no elimination');
    assert.equal(question.shown.filter(word => pool.includes(word)).length, Math.min(pool.length, level.cards), 'topic pictures come first');
  }
});

test('Kim rounds grow 3→4→5→6 cards, then hide two, and step back after a miss', () => {
  assert.deepEqual(KIM_LEVELS.map(level => `${level.cards}/${level.hide}`), ['3/1', '4/1', '5/1', '6/1', '6/2']);
  assert.equal(KIM_QUESTIONS, 5);
  let level = 0; const seen = [];
  for (let i = 0; i < 5; i++) { seen.push(level); level = adaptKimLevel(level, true); }
  assert.deepEqual(seen, [0, 1, 2, 3, 4]);
  assert.equal(adaptKimLevel(4, true), 4);
  assert.equal(adaptKimLevel(2, false), 1);
  assert.equal(adaptKimLevel(0, false), 0);
  assert.deepEqual([nextKimStart(4), nextKimStart(3), nextKimStart(1)], [2, 1, 0]);
});

test('Kim needs enough pictures for never-shown answers', () => {
  assert.throws(() => buildKimQuestion(words.slice(0, 4), [], KIM_LEVELS[0]), /több kép/);
  assert.equal(buildKimQuestion(words.slice(0, 2), words, KIM_LEVELS[3]).shown.length, 6);
});

test('find mode grows 4→6→8 after a good round and shrinks after a hard one', () => {
  assert.deepEqual(FIND_SIZES, [4, 6, 8]);
  assert.equal(nextFindSize(4, 4, 4), 6);
  assert.equal(nextFindSize(6, 5, 6), 8);
  assert.equal(nextFindSize(8, 8, 8), 8);
  assert.equal(nextFindSize(6, 4, 6), 6);
  assert.equal(nextFindSize(6, 2, 6), 4);
  assert.equal(nextFindSize(4, 1, 4), 4);
});

test('stars count first-try answers, the topic fills a board first, saved levels are checked', () => {
  assert.deepEqual([roundStars(5, 5), roundStars(3, 5), roundStars(4, 8), roundStars(0, 4)], [5, 3, 3, 1]);
  const family = words.filter(word => wordCategories.find(c => c.id === 'family').words.includes(word.id));
  const pool = fillWordPool(family, words, seeded(4));
  assert.equal(pool.length, words.length);
  assert.ok(pool.slice(0, family.length).every(word => family.includes(word)));
  assert.deepEqual(normalizeFlipLevels({ kimStart: 9, findSize: 7 }), { kimStart: 2, findSize: 4 });
  assert.deepEqual(normalizeFlipLevels({ kimStart: 1, findSize: 8 }), { kimStart: 1, findSize: 8 });
});
