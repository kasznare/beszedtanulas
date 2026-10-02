import test from 'node:test';
import assert from 'node:assert/strict';
import { dressItems, buildDressRound } from '../dress-data.js';

test('every dressing round completes an outfit, with no repeated requests', () => {
  for (const count of [2, 3]) {
    for (const random of [() => 0, () => .5, () => .999, Math.random]) {
      const round = buildDressRound(count, random);
      assert.equal(round.length, 4);
      assert.deepEqual(new Set(round.map(question => question.target.id)), new Set(dressItems.map(item => item.id)));
      for (const question of round) {
        assert.equal(question.choices.length, count);
        assert.equal(new Set(question.choices.map(item => item.id)).size, count);
        assert.equal(question.choices.filter(item => item.id === question.target.id).length, 1);
      }
    }
  }
});

test('unrecognized choice settings fall back to two pictures', () => {
  for (const count of [undefined, null, -1, 0, 1, 4, 100, '3']) {
    assert.ok(buildDressRound(count).every(question => question.choices.length === 2));
  }
});

test('round generation preserves content and shuffles the correct answer position', () => {
  const original = JSON.stringify(dressItems);
  const first = buildDressRound(3, () => 0);
  const second = buildDressRound(3, () => .999);
  assert.notEqual(first[0].choices.indexOf(first[0].target), second[0].choices.indexOf(second[0].target));
  assert.equal(JSON.stringify(dressItems), original);
});
