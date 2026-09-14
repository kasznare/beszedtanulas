import test from 'node:test';
import assert from 'node:assert/strict';
import { twoWordPhrases } from '../game-data.js';
import { matchTwoWordPhrase } from '../speech-matching.js';

const phrase = id => twoWordPhrases.find(item => item.id === id).targets;

test('all six taught phrases are accepted with Hungarian accents', () => {
  for (const item of twoWordPhrases) {
    assert.equal(matchTwoWordPhrase(item.targets, [item.text]).success, true, item.text);
  }
});

test('two separate recognition alternatives cannot form a phrase', () => {
  assert.equal(matchTwoWordPhrase(phrase('kerek_vizet'), ['kérek', 'vizet']).success, false);
  assert.equal(matchTwoWordPhrase(phrase('kerek_vizet'), ['kérek almát', 'itt a víz']).success, false);
});

test('one shared alias cannot count as two spoken words', () => {
  const targets = [{base:'apa', aliases:['aba']}, {base:'labda', aliases:['aba']}];
  assert.equal(matchTwoWordPhrase(targets, ['aba']).success, false);
  assert.equal(matchTwoWordPhrase(targets, ['aba labda']).success, true);
});

test('aliases, punctuation and flexible word order still work', () => {
  assert.equal(matchTwoWordPhrase(phrase('kerek_vizet'), ['víz, kérem!']).success, true);
  assert.equal(matchTwoWordPhrase(phrase('apa_auto'), ['aba,otu']).success, true);
  assert.equal(matchTwoWordPhrase(phrase('anya_gyere'), ['ana gye']).success, true);
});

test('missing, repeated and unrelated words remain incomplete', () => {
  for (const text of ['', 'kérek', 'vizet vizet', 'cica busz']) {
    assert.equal(matchTwoWordPhrase(phrase('kerek_vizet'), [text]).success, false, text);
  }
});
