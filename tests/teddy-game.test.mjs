import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeddyRound, teddyFoods, TEDDY_CLIPS } from '../teddy-data.js';

test('both teddy modes keep the requested foods distinct and available in every round', () => {
  for (const mode of ['single', 'sequence']) for (const count of [2, 3]) for (const length of [3, 5, 10]) {
    const rounds = buildTeddyRound(length, count, mode, () => .4);
    assert.equal(rounds.length, length);
    for (const round of rounds) {
      assert.equal(round.targets.length, mode === 'single' ? 1 : 2);
      assert.equal(new Set(round.targets.map(item => item.id)).size, round.targets.length);
      assert.equal(new Set(round.choices.map(item => item.id)).size, count);
      for (const target of round.targets) assert.ok(round.choices.some(item => item.id === target.id));
      if (mode === 'sequence') assert.match(TEDDY_CLIPS[`teddy_sequence_${round.targets.map(item => item.id).join('_')}`], /^Először .+ aztán .+\.$/);
    }
  }
});
test('every possible two-food instruction has a complete Hungarian recording text', () => {
  for (const first of teddyFoods) for (const second of teddyFoods) if (first.id !== second.id) {
    assert.ok(TEDDY_CLIPS[`teddy_sequence_${first.id}_${second.id}`]);
  }
});
