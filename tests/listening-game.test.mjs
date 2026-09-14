import assert from 'node:assert/strict';
import test from 'node:test';
import { words, wordCategories } from '../game-data.js';
import { buildListeningRound } from '../listening-game.js';

test('every topic and level has distinct choices and exactly one valid target', () => {
  for (const category of wordCategories) {
    const pool = words.filter(word => category.words.includes(word.id));
    for (const length of [3, 5, 10]) for (const choiceCount of [2, 3]) {
      const round = buildListeningRound(pool, length, choiceCount);
      assert.equal(round.length, length);
      for (const [index, question] of round.entries()) {
        assert.equal(question.choices.length, Math.min(pool.length, choiceCount));
        assert.equal(new Set(question.choices.map(word => word.id)).size, question.choices.length);
        assert.equal(question.choices.filter(word => word.id === question.target.id).length, 1);
        assert.ok(question.choices.every(word => category.words.includes(word.id)));
        if (index) assert.notEqual(question.target.id, round[index - 1].target.id);
      }
    }
  }
});

test('cycles cover a topic before repeating and do not mutate shared content', () => {
  const pool = Object.freeze(words.slice(0, 4));
  const original = JSON.stringify(pool);
  const round = buildListeningRound(pool, 10, 3, () => .5);
  assert.equal(new Set(round.slice(0, 4).map(question => question.target.id)).size, 4);
  assert.equal(new Set(round.slice(4, 8).map(question => question.target.id)).size, 4);
  assert.equal(JSON.stringify(pool), original);
});

test('duplicate content cannot create identical answers or a one-picture game', () => {
  assert.throws(() => buildListeningRound([words[0], words[0]]), /két külön kép/);
  const round = buildListeningRound([words[0], words[0], words[1]], 10, 3, () => .99);
  assert.ok(round.every(question => question.choices.length === 2));
  assert.ok(round.every((question, index) => !index || question.target.id !== round[index - 1].target.id));
});

test('answer placement varies with the shuffle, not with target identity', () => {
  const pool = words.slice(0, 3);
  const first = buildListeningRound(pool, 3, 3, () => 0);
  const last = buildListeningRound(pool, 3, 3, () => .99);
  assert.notEqual(first[0].choices.findIndex(word => word.id === first[0].target.id), last[0].choices.findIndex(word => word.id === last[0].target.id));
});
