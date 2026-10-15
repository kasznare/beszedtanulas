import test from 'node:test';
import assert from 'node:assert/strict';
import { twoWordPhrases } from '../game-data.js';
import { matchTwoWordPhrase, normalizeText } from '../speech-matching.js';

test('two-word practice has coherent groups and two distinct visual cues per utterance', () => {
  assert.ok(twoWordPhrases.length >= 20 && twoWordPhrases.length <= 30);
  assert.equal(new Set(twoWordPhrases.map(phrase => phrase.id)).size, twoWordPhrases.length);
  for (const id of ['kerek_vizet', 'meg_alma', 'anya_gyere', 'apa_auto', 'nagy_labda', 'nem_kerem']) {
    assert.ok(twoWordPhrases.some(phrase => phrase.id === id), `${id} must remain addressable`);
  }
  for (const phrase of twoWordPhrases) {
    assert.ok(['request', 'person_action', 'attribute_object', 'more_stop'].includes(phrase.group), phrase.id);
    assert.ok(['food', 'family', 'animals', 'play', 'nature', 'home'].includes(phrase.topic), phrase.id);
    assert.equal(phrase.text.split(/\s+/).length, 2, phrase.id);
    assert.equal(phrase.emojis.length, 2, phrase.id);
    assert.ok(phrase.emojis.every(Boolean), phrase.id);
    assert.equal(phrase.targets.length, 2, phrase.id);
    assert.deepEqual(phrase.targets.map(target => normalizeText(target.base)), phrase.text.split(' ').map(normalizeText), phrase.id);
    assert.equal(matchTwoWordPhrase(phrase.targets, [phrase.text]).success, true, phrase.id);
  }
  for (const group of ['request', 'person_action', 'attribute_object', 'more_stop']) {
    assert.ok(twoWordPhrases.filter(phrase => phrase.group === group).length >= 4, group);
  }
});
