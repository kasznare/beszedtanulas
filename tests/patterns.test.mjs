import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERN_LEVELS, PATTERN_FAMILIES, createPatternRound, tokenKey, tokenLabel } from '../patterns-data.js';
import { patternTokenArt } from '../patterns-art.js';
import { GROUPS, canonicalTrail } from '../navigation.js';

const levels = ['starter', 'explorer', 'thinker'];
const families = ['mixed', 'shapes', 'colors', 'sizes', 'directions'];
const vocabulary = {
  shape: ['circle', 'square', 'triangle', 'star', 'diamond', 'arrow'],
  color: ['red', 'blue', 'yellow', 'green', 'purple', 'orange'],
  size: ['small', 'medium', 'large'],
  direction: ['up', 'right', 'down', 'left'],
};
const keys = tokens => tokens.map(tokenKey);
const rhythm = tokens => {
  const seen = [];
  return keys(tokens).map(key => { if (!seen.includes(key)) seen.push(key); return String.fromCharCode(65 + seen.indexOf(key)); }).join('');
};
const signature = round => keys(round.preview).join('|');

// Seed values are spread over the 32-bit range so neighbouring PRNG states do
// not accidentally test just one of the available authored rhythms.
const seeds = Array.from({ length: 128 }, (_, index) => Math.imul(index + 1, 0x9e3779b9) >>> 0);

test('the direct game exposes three levels and five distinct pattern families', () => {
  assert.deepEqual(PATTERN_LEVELS.map(level => level.id), levels);
  assert.deepEqual(PATTERN_FAMILIES.map(family => family.id), families);
  assert.deepEqual(GROUPS.filter(group => group.screens.includes('patterns')).map(group => group.screen), ['number-menu']);
  assert.deepEqual(canonicalTrail({ screen: 'patterns' }).map(route => route.screen), ['home', 'number-menu', 'patterns']);
});

test('every generated sequence repeats a complete motif and continues at the exact next position', () => {
  for (const levelId of levels) for (const familyId of families) for (const seed of seeds) {
    const round = createPatternRound({ levelId, familyId, seed });
    const label = `${levelId}/${familyId}/${seed}`;
    assert.equal(round.levelId, levelId, label);
    assert.equal(round.familyId, familyId, label);
    assert.ok(typeof round.id === 'string' && round.id.length, label);
    assert.ok(typeof round.ruleLabel === 'string' && round.ruleLabel.length, label);
    assert.ok([2, 3, 4, 6].includes(round.motif.length), label);
    assert.ok([6, 8, 12].includes(round.preview.length), label);
    assert.ok(round.preview.length >= round.motif.length * 2, `${label}: at least two full cycles`);
    assert.equal(round.answers.length, 3, label);
    const sequence = [...round.preview, ...round.answers];
    for (const [index, token] of sequence.entries()) {
      assert.equal(tokenKey(token), tokenKey(round.motif[index % round.motif.length]), `${label}: position ${index}`);
      for (const [field, values] of Object.entries(vocabulary)) assert.ok(values.includes(token[field]), `${label}: valid ${field}`);
      assert.ok(tokenLabel(token).length > 2, label);
    }
  }
});

test('difficulty changes the actual repeating rule, including the independent two-colour/three-shape cycle', () => {
  const allowed = { starter: ['AB', 'ABC'], explorer: ['AAB', 'ABB', 'AABB', 'ABC'], thinker: ['ABAC', 'ABCB', 'AABC', 'ABCDEF'] };
  let compoundFound = 0;
  for (const levelId of levels) for (const familyId of families) {
    const observed = new Set();
    for (const seed of seeds) {
      const round = createPatternRound({ levelId, familyId, seed }), code = rhythm(round.motif);
      assert.ok(allowed[levelId].includes(code), `${levelId}/${familyId}: unexpected ${code}`);
      observed.add(code);
      if (code === 'ABCDEF') {
        assert.equal(levelId, 'thinker'); assert.equal(familyId, 'mixed');
        assert.equal(new Set(round.motif.map(token => token.color)).size, 2);
        assert.equal(new Set(round.motif.map(token => token.shape)).size, 3);
        for (let i = 0; i < 6; i++) {
          assert.equal(round.motif[i].color, round.motif[i % 2].color);
          assert.equal(round.motif[i].shape, round.motif[i % 3].shape);
        }
        compoundFound++;
      }
    }
    assert.ok(observed.size >= 2, `${levelId}/${familyId}: varied rhythms`);
  }
  assert.ok(compoundFound > 0, 'The advanced mixed collection includes the six-element combined rule');
});

test('choices are unique, include every answer, and preserve the chosen family dimension', () => {
  const changing = { shapes: 'shape', colors: 'color', sizes: 'size', directions: 'direction' };
  for (const levelId of levels) for (const familyId of families) for (const seed of seeds) {
    const round = createPatternRound({ levelId, familyId, seed });
    const choiceKeys = keys(round.choices);
    assert.equal(round.choices.length, familyId === 'sizes' ? 3 : 4);
    assert.equal(new Set(choiceKeys).size, round.choices.length);
    assert.equal(new Set(round.choices.map(tokenLabel)).size, round.choices.length, `${levelId}/${familyId}: distinguishable spoken labels`);
    for (const answer of keys(round.answers)) assert.ok(choiceKeys.includes(answer), `${levelId}/${familyId}: answer is selectable`);
    if (changing[familyId]) {
      const tokens = [...round.motif, ...round.choices];
      for (const field of Object.keys(vocabulary).filter(field => field !== changing[familyId])) {
        assert.equal(new Set(tokens.map(token => token[field])).size, 1, `${levelId}/${familyId}: unrelated ${field} must stay constant`);
      }
      if (familyId === 'directions') assert.ok(tokens.every(token => token.shape === 'arrow'), 'Direction changes use a visible asymmetric arrow');
    }
  }
});

test('seeds reproduce the same round while each family and level has genuine visual variety', () => {
  const initial = JSON.stringify([PATTERN_LEVELS, PATTERN_FAMILIES]);
  for (const levelId of levels) for (const familyId of families) {
    const variants = new Set();
    for (const seed of seeds.slice(0, 32)) {
      const options = { levelId, familyId, seed }, before = structuredClone(options);
      const first = createPatternRound(options), second = createPatternRound(options);
      assert.deepEqual(first, second);
      assert.deepEqual(options, before);
      variants.add(signature(first));
      first.preview[0].color = 'not-a-colour';
      assert.notEqual(second.preview[0].color, 'not-a-colour', 'Separate rounds cannot share mutable token objects');
      assert.deepEqual(createPatternRound(options), second, 'A caller cannot modify future rounds through returned objects');
    }
    assert.ok(variants.size >= 4, `${levelId}/${familyId}: ${variants.size} visual variants`);
  }
  assert.equal(JSON.stringify([PATTERN_LEVELS, PATTERN_FAMILIES]), initial);
});

test('unknown options normalize to a playable known level and family', () => {
  for (const options of [{}, { levelId: 'unknown', familyId: 'unknown', seed: 0 }, { seed: -1 }, { seed: NaN }, { seed: Infinity }]) {
    const round = createPatternRound(options);
    assert.ok(levels.includes(round.levelId)); assert.ok(families.includes(round.familyId));
    assert.equal(round.answers.length, 3);
    assert.ok(round.answers.every(answer => keys(round.choices).includes(tokenKey(answer))));
  }
});

test('every choice has portable labelled SVG art and its visible markup differs from distractors', () => {
  const visible = svg => svg.replace(/\s(?:aria-label|data-pattern-token|id)="[^"]*"/g, '').replace(/<title[^>]*>[\s\S]*?<\/title>/g, '');
  for (const levelId of levels) for (const familyId of families) for (const seed of seeds.slice(0, 16)) {
    const round = createPatternRound({ levelId, familyId, seed });
    const art = round.choices.map(token => patternTokenArt(token));
    for (const svg of art) {
      assert.match(svg, /^<svg\b/);
      assert.match(svg, /viewBox="0 0 120 120"/);
      assert.match(svg, /aria-label="[^"]+"/);
      assert.doesNotMatch(svg, /<script\b|<image\b|<foreignObject\b|https?:\/\/(?!www\.w3\.org)/i);
    }
    assert.equal(new Set(art.map(visible)).size, art.length, `${levelId}/${familyId}: choices must differ beyond metadata`);
  }
});
