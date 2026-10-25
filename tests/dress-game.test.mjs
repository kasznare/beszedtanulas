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

import { allDressItems, DRESS_OUTFITS, DRESS_CLIPS, toggleDressItem } from '../dress-data.js';
test('weather rounds complete the selected outfit and retain unique shuffled choices', () => {
  for (const outfit of Object.keys(DRESS_OUTFITS)) for (const count of [2, 3]) {
    const rounds = buildDressRound(count, () => .7, outfit);
    assert.deepEqual(new Set(rounds.map(question => question.target.id)), new Set(DRESS_OUTFITS[outfit].items));
    for (const question of rounds) {
      assert.equal(question.choices.length, count);
      assert.equal(new Set(question.choices.map(item => item.id)).size, count);
      assert.ok(question.choices.includes(question.target));
    }
  }
  assert.deepEqual(buildDressRound(2, () => .7, 'unknown'), buildDressRound(2, () => .7));
});
test('wardrobe swaps garments in the same place without losing other clothes', () => {
  const original = new Set(['sapka', 'polo', 'cipo']);
  const summer = toggleDressItem(toggleDressItem(original, 'napkalap'), 'szandal');
  assert.deepEqual([...summer], ['polo', 'napkalap', 'szandal']);
  assert.deepEqual([...original], ['sapka', 'polo', 'cipo']);
  assert.deepEqual([...toggleDressItem(summer, 'napkalap')], ['polo', 'szandal']);
  assert.deepEqual(toggleDressItem(summer, 'unknown'), summer);
  assert.deepEqual([...toggleDressItem(summer, 'esokabat')], ['polo', 'napkalap', 'szandal', 'esokabat']);
});
test('every wardrobe item has request, response and spoken-name text', () => {
  for (const item of allDressItems) {
    assert.equal(DRESS_CLIPS[`dress_request_${item.id}`], item.request);
    assert.equal(DRESS_CLIPS[`dress_thanks_${item.id}`], item.thanks);
    assert.equal(DRESS_CLIPS[`dress_name_${item.id}`], item.label);
  }
});

import { readFileSync } from 'node:fs';
import { VOICE_CLIPS } from '../voice-library.js';
import { DRESS_SLOTS, DRESS_BODY_ORDER, DRESS_WEATHERS, buildWeatherRound, pickDressDistractors, matchingWeather, nextDressOutfit, pickWeather, dressStars } from '../dress-data.js';
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const bodyRank = id => DRESS_BODY_ORDER.indexOf(DRESS_SLOTS[id]);

test('named outfits dress in a fixed body order and never offer a garment Maci already wears', () => {
  const random = seeded(4);
  for (const outfit of DRESS_WEATHERS) for (const count of [2, 3]) for (let run = 0; run < 20; run += 1) {
    const rounds = buildDressRound(count, random, outfit);
    const order = rounds.map(question => bodyRank(question.target.id));
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
    assert.equal(rounds[0].target.id, 'polo');
    assert.match(rounds.at(-1).target.id, /cipo|gumicsizma|szandal/);
    const worn = [];
    for (const question of rounds) {
      for (const choice of question.choices) assert.ok(!worn.includes(choice.id), `${choice.id} is already worn`);
      worn.push(question.target.id);
    }
  }
});

test('distractors prefer a garment for the same place from another outfit', () => {
  const random = seeded(9);
  for (let run = 0; run < 20; run += 1) {
    assert.ok(['napkalap'].includes(pickDressDistractors(allDressItems.find(item => item.id === 'sapka'), { count: 1, random })[0].id));
    assert.ok(['gumicsizma', 'szandal'].includes(pickDressDistractors(allDressItems.find(item => item.id === 'cipo'), { count: 1, random })[0].id));
  }
});

test('the weather game offers exactly one fitting garment per place and speaks only the weather', () => {
  const random = seeded(2);
  for (const weather of DRESS_WEATHERS) for (const count of [2, 3]) {
    const plan = buildWeatherRound(weather, count, random);
    const fitting = new Set(DRESS_OUTFITS[weather].items);
    assert.deepEqual(plan.preWorn, ['polo']);
    assert.deepEqual(new Set([...plan.preWorn, ...plan.steps.map(step => step.target.id)]), fitting);
    const order = plan.steps.map(step => bodyRank(step.target.id));
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
    for (const step of plan.steps) {
      assert.equal(step.choices.length, count);
      assert.equal(step.choices.filter(item => fitting.has(item.id)).length, 1, `${weather}: one fitting choice`);
      assert.ok(VOICE_CLIPS[`dress_thanks_${step.target.id}`]);
    }
    assert.ok(VOICE_CLIPS[`dress_weather_${weather}`]);
  }
  // Weather and outfit rotation never repeat the previous one.
  for (let run = 0; run < 30; run += 1) assert.notEqual(pickWeather('rain', random), 'rain');
  assert.deepEqual(['classic', 'rain', 'summer'].map(nextDressOutfit), ['rain', 'summer', 'classic']);
  assert.equal(nextDressOutfit('free'), 'free');
});

test('the free wardrobe only counts an outfit that fits a weather card exactly', () => {
  assert.equal(matchingWeather(['polo']), null);
  assert.equal(matchingWeather(['polo', 'esokabat', 'gumicsizma']), 'rain');
  assert.equal(matchingWeather(['sapka', 'polo', 'sal', 'cipo']), 'classic');
  assert.equal(matchingWeather(['polo', 'napkalap', 'rovidnadrag', 'szandal', 'sal']), null);
  assert.equal(dressStars(4, 4), 5);
  assert.equal(dressStars(2, 4), 3);
  assert.equal(dressStars(0, 3), 1);
});

test('the dress game speaks only recorded clips and no longer gives a star for one garment', () => {
  const source = readFileSync(new URL('../dress-game.js', import.meta.url), 'utf8');
  for (const [, id] of source.matchAll(/'((?:dress|guide)_[a-z_]+)'/g)) assert.ok(VOICE_CLIPS[id], id);
  assert.doesNotMatch(source, /onComplete\(worn\.size\)/);
});
