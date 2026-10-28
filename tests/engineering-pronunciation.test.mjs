import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINEERING_CLIPS } from '../engineering-data.js';
import { ENGINEERING_PHONETIC_IDS, ENGINEERING_WORD_IPA, phoneticEngineeringText } from '../engineering-voice-pronunciation.js';
import { REWORK_PHONETIC_IDS } from '../rework-voice-pronunciation.js';

const displayedWords = text => text.match(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu) || [];
const spokenWords = text => text.match(/\/[^/\n]+\/|[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu) || [];

test('all seven engineering instructions have a separate phonetic v4 input with aligned words', () => {
  assert.equal(ENGINEERING_PHONETIC_IDS.length, 7);
  assert.equal(new Set(ENGINEERING_PHONETIC_IDS).size, 7);
  // The three lines added with the 2026 rework are pronounced from rework-voice-pronunciation.js.
  for (const id of Object.keys(ENGINEERING_CLIPS)) assert.ok(ENGINEERING_PHONETIC_IDS.includes(id) || REWORK_PHONETIC_IDS.includes(id), id);
  for (const id of ENGINEERING_PHONETIC_IDS) {
    const display = ENGINEERING_CLIPS[id];
    const spoken = phoneticEngineeringText(id, display);
    assert.notEqual(spoken, display, `No phonetic input: ${id}`);
    assert.match(spoken, /\/[^/]+\//, `No IPA token: ${id}`);
    assert.equal(spokenWords(spoken).length, displayedWords(display).length, `Changed word positions: ${id}`);
  }
  assert.equal(phoneticEngineeringText('chess_start', 'Építs!'), null);
});

test('reviewed words distinguish vowel length and Hungarian consonants', () => {
  assert.equal(ENGINEERING_WORD_IPA.építs, 'ˈeːpiːt͡ʃ');
  assert.equal(ENGINEERING_WORD_IPA.szigetre, 'ˈsiɡɛtrɛ');
  assert.equal(ENGINEERING_WORD_IPA.rúddal, 'ˈruːdːɒl');
  assert.equal(ENGINEERING_WORD_IPA.rudakkal, 'ˈrudɒkːɒl');
  assert.equal(ENGINEERING_WORD_IPA.rakományt, 'ˈrɒkomaːɲt');
  assert.equal(phoneticEngineeringText('engineering_hub', 'Még építs hidat!', {még:'ˈmeːɡ'}), '/ˈmeːɡ/ /ˈeːpiːt͡ʃ/ hidat!');
});
