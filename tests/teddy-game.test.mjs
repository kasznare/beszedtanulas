import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeddyRound, buildExpressiveTeddyRound, teddyFoodForPhrase, teddyFoods, teddyAccusative, TEDDY_CLIPS } from '../teddy-data.js';

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

test('expressive rounds offer a real choice and start with a linked phrase food', () => {
  for (const count of [2, 3]) {
    const rounds = buildExpressiveTeddyRound(5, count, teddyFoodForPhrase('kerek_vizet'), () => .4);
    assert.equal(rounds.length, 5);
    assert.ok(rounds[0].choices.some(food => food.id === 'viz'));
    for (const round of rounds) {
      assert.deepEqual(round.targets, []);
      assert.equal(new Set(round.choices.map(food => food.id)).size, count);
      assert.ok(round.choices.every(food => teddyFoods.includes(food)));
    }
  }
  assert.equal(teddyFoodForPhrase('anya_gyere'), null);
});

test('each expressive food has a grammatically correct one- and two-word model', () => {
  for (const food of teddyFoods) {
    assert.ok(food.label);
    assert.equal(TEDDY_CLIPS[`teddy_sequence_${food.id}_${teddyFoods.find(other => other.id !== food.id).id}`].includes(teddyAccusative[food.id]), true);
  }
  assert.equal(teddyAccusative.viz, 'vizet');
  assert.equal(teddyAccusative.alma, 'almát');
  assert.equal(teddyAccusative.kenyer, 'kenyeret');
});
