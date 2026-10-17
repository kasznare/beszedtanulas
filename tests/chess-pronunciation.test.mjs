import test from 'node:test';
import assert from 'node:assert/strict';
import { CHESS_CLIPS } from '../chess-data.js';
import { CHESS_PHONETIC_IDS, CHESS_WORD_IPA, phoneticChessText } from '../chess-voice-pronunciation.js';

const displayedWords = text => text.match(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu) || [];
const spokenWords = text => text.match(/\/[^/\n]+\/|[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu) || [];

test('every new chess instruction has a scoped v4 phonetic input with one spoken token per displayed word', () => {
  assert.equal(CHESS_PHONETIC_IDS.length, 24);
  assert.equal(new Set(CHESS_PHONETIC_IDS).size, 24);
  for (const id of CHESS_PHONETIC_IDS) {
    const text = CHESS_CLIPS[id];
    assert.ok(text, `Unknown chess clip: ${id}`);
    const target = phoneticChessText(id, text);
    assert.notEqual(target, text, `No phonetic variant: ${id}`);
    assert.equal(spokenWords(target).length, displayedWords(text).length, `Word position changed: ${id}`);
    assert.match(target, /\/[^/]+\//, `Missing IPA token: ${id}`);
  }
  assert.equal(phoneticChessText('chess_start', CHESS_CLIPS.chess_start), null);
});

test('the local mapping distinguishes Hungarian vowel length and consonant clusters', () => {
  assert.equal(CHESS_WORD_IPA.bástyával, 'ˈbaːʃcɒvɒl');
  assert.equal(CHESS_WORD_IPA.huszárral, 'ˈhusaːrːɒl');
  assert.equal(CHESS_WORD_IPA.gyaloggal, 'ˈɟɒloɡːɒl');
  assert.equal(CHESS_WORD_IPA.vezérré, 'ˈvɛzeːrːeː');
  assert.match(phoneticChessText('chess_rook_three', CHESS_CLIPS.chess_rook_three), /\/ˈt͡ʃilːɒɡrɒ\//);
  assert.equal(phoneticChessText('chess_rook_three', 'Még a csillagra.', {még:'ˈmeːɡ'}), '/ˈmeːɡ/ a /ˈt͡ʃilːɒɡrɒ/.');
});
