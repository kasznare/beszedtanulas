import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTeddyRound, buildTeddyRequest, buildSequenceRequest, buildExpressiveTeddyRound, sequencePromptIds, sequenceDistractorCount, shouldAskForMore, teddyFoodForPhrase, teddyFoods, teddyAccusative, teddyPlateRange, teddyStars, updateTeddyLadder, TEDDY_CLIPS, TEDDY_SPAN, TEDDY_MAX_PLATES } from '../teddy-data.js';
import { VOICE_CLIPS } from '../voice-library.js';

const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test('single requests keep distinct plates, include the target and never repeat a food by accident', () => {
  const random = seeded(7);
  for (const plates of [2, 3, 4, 5]) {
    let previousId = null;
    for (let index = 0; index < 40; index += 1) {
      const request = buildTeddyRequest({ plates, previousId, random });
      assert.equal(request.choices.length, plates);
      assert.equal(new Set(request.choices.map(food => food.id)).size, plates);
      assert.ok(request.choices.includes(request.target));
      assert.notEqual(request.target.id, previousId);
      assert.equal(request.again, false);
      previousId = request.target.id;
    }
  }
  assert.equal(buildTeddyRequest({ plates: 9 }).choices.length, TEDDY_MAX_PLATES);
});

test('"még kérek" asks for the same food again on reshuffled plates, but never twice in a row', () => {
  const request = buildTeddyRequest({ plates: 4, previousId: 'tej', again: true, random: seeded(3) });
  assert.equal(request.target.id, 'tej');
  assert.equal(request.again, true);
  assert.equal(shouldAskForMore({ random: () => 0, previousWasMore: true }), false);
  assert.equal(shouldAskForMore({ random: () => 0 }), true);
  assert.equal(shouldAskForMore({ random: () => .9 }), false);
  for (const id of ['phrase_meg_kerek', 'phrase_eleg_volt', 'phrase_nem_kerem', 'guide_teddy_thanks', 'guide_listening']) assert.ok(VOICE_CLIPS[id], id);
});

test('the plate ladder grows after two clean answers and eases back after two misses', () => {
  const range = teddyPlateRange(2);
  assert.deepEqual(range, { min: 2, max: 5 });
  assert.equal(teddyPlateRange(3).min, 3);
  let state = { level: range.min, clean: 0, missed: 0 };
  const levels = [];
  for (let index = 0; index < 8; index += 1) { state = updateTeddyLadder(state, true, range); levels.push(state.level); }
  assert.deepEqual(levels, [2, 3, 3, 4, 4, 5, 5, 5]);
  state = updateTeddyLadder(state, false, range);
  assert.equal(state.level, 5);
  state = updateTeddyLadder(state, false, range);
  assert.equal(state.level, 4);
  // A clean answer between misses resets the miss streak.
  state = updateTeddyLadder(updateTeddyLadder(updateTeddyLadder(state, false, range), true, range), false, range);
  assert.equal(state.level, 4);
});

test('ordered requests hide nothing by elimination: there is always a plate that is not asked for', () => {
  const random = seeded(11);
  for (let span = TEDDY_SPAN.min; span <= TEDDY_SPAN.max; span += 1) for (const choiceCount of [2, 3]) {
    let previousIds = [];
    for (let index = 0; index < 30; index += 1) {
      const request = buildSequenceRequest({ span, choiceCount, previousIds, random });
      const ids = request.targets.map(food => food.id);
      assert.equal(request.targets.length, span);
      assert.equal(new Set(ids).size, span);
      assert.ok(request.choices.length > span, 'at least one distractor plate');
      assert.ok(request.choices.length <= TEDDY_MAX_PLATES);
      assert.equal(new Set(request.choices.map(food => food.id)).size, request.choices.length);
      for (const food of request.targets) assert.ok(request.choices.includes(food));
      assert.notDeepEqual(ids, previousIds);
      previousIds = ids;
    }
  }
  assert.equal(sequenceDistractorCount(2, 3), 2);
  assert.equal(sequenceDistractorCount(4, 3), 1);
});

test('ordered prompts use recorded clips: one sentence for two foods, chained requests for longer orders', () => {
  const [alma, kifli, kenyer] = ['alma', 'kifli', 'kenyer'].map(id => teddyFoods.find(food => food.id === id));
  assert.deepEqual(sequencePromptIds([alma, kifli]), ['teddy_sequence_alma_kifli']);
  assert.deepEqual(sequencePromptIds([alma, kifli], { intro: true }), ['teddy_sequence_intro', 'teddy_sequence_alma_kifli']);
  assert.deepEqual(sequencePromptIds([alma, kifli, kenyer]), ['teddy_alma', 'teddy_kifli', 'teddy_kenyer']);
  for (let span = 2; span <= 4; span += 1) {
    for (const id of sequencePromptIds(teddyFoods.slice(0, span), { intro: true })) assert.ok(VOICE_CLIPS[id], id);
  }
  // The memory span climbs 2 → 3 → 4 and falls back after two failed orders.
  let span = { level: TEDDY_SPAN.min, clean: 0, missed: 0 };
  for (const clean of [true, true, true, true]) span = updateTeddyLadder(span, clean, TEDDY_SPAN);
  assert.equal(span.level, 4);
  for (const clean of [false, false]) span = updateTeddyLadder(span, clean, TEDDY_SPAN);
  assert.equal(span.level, 3);
});

test('stars follow first-try answers instead of the round length', () => {
  assert.equal(teddyStars(5, 5), 5);
  assert.equal(teddyStars(10, 10), 5);
  assert.equal(teddyStars(3, 5), 3);
  assert.equal(teddyStars(0, 5), 1);
  assert.equal(teddyStars(1, 3), 2);
});

test('legacy whole-round builder still gives distinct, available requests', () => {
  for (const mode of ['single', 'sequence']) for (const count of [2, 3]) for (const length of [3, 5, 10]) {
    const rounds = buildTeddyRound(length, count, mode, seeded(5));
    assert.equal(rounds.length, length);
    for (const round of rounds) {
      assert.equal(round.targets.length, mode === 'single' ? 1 : 2);
      assert.equal(new Set(round.targets.map(item => item.id)).size, round.targets.length);
      for (const target of round.targets) assert.ok(round.choices.some(item => item.id === target.id));
      if (mode === 'sequence') {
        assert.ok(round.choices.length > 2);
        assert.match(TEDDY_CLIPS[`teddy_sequence_${round.targets.map(item => item.id).join('_')}`], /^Először .+ aztán .+\.$/);
      }
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
    assert.ok(VOICE_CLIPS[`word_${food.id}`] && VOICE_CLIPS[`teddy_${food.id}`]);
    assert.equal(TEDDY_CLIPS[`teddy_sequence_${food.id}_${teddyFoods.find(other => other.id !== food.id).id}`].includes(teddyAccusative[food.id]), true);
  }
  assert.equal(teddyAccusative.viz, 'vizet');
  assert.equal(teddyAccusative.alma, 'almát');
  assert.equal(teddyAccusative.kenyer, 'kenyeret');
});

test('the teddy game speaks only recorded clips and the expressive mode no longer gives food away', () => {
  const source = readFileSync(new URL('../teddy-game.js', import.meta.url), 'utf8');
  for (const [, id] of source.matchAll(/"((?:phrase|guide|teddy)_[a-z_]+)"/g)) assert.ok(VOICE_CLIPS[id], id);
  assert.doesNotMatch(source, /Add oda Macinak/);
  assert.match(source, /Még kérek/);
  assert.match(source, /Elég volt/);
});
