import test from 'node:test';
import assert from 'node:assert/strict';
import { compileVoiceManifest } from '../scripts/build-voice-manifest.mjs';
import { REWORK_PHONETIC_IDS, REWORK_WORD_IPA, phoneticReworkText } from '../rework-voice-pronunciation.js';
import { CHESS_PHONETIC_IDS } from '../chess-voice-pronunciation.js';
import { ENGINEERING_PHONETIC_IDS } from '../engineering-voice-pronunciation.js';
import { readFile } from 'node:fs/promises';

const displayedWords = text => text.match(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu) || [];
const spokenWords = text => text.match(/\/[^/\n]+\/|[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu) || [];

test('every rework line has a scoped v4 phonetic input in which each content word is transcribed', async () => {
  const { clips } = await compileVoiceManifest();
  const common = JSON.parse(await readFile(new URL('../voice-pronunciation.json', import.meta.url), 'utf8')).words;
  assert.equal(REWORK_PHONETIC_IDS.length, 39);
  assert.equal(new Set(REWORK_PHONETIC_IDS).size, 39);
  for (const id of REWORK_PHONETIC_IDS) {
    const clip = clips.find(clip => clip.id === id);
    assert.ok(clip, `Unknown rework clip: ${id}`);
    const target = phoneticReworkText(id, clip.text, common);
    assert.notEqual(target, clip.text, `No phonetic variant: ${id}`);
    assert.equal(spokenWords(target).length, displayedWords(clip.text).length, `Word position changed: ${id}`);
    // Only the articles a/az may stay in plain spelling.
    const plain = spokenWords(target).filter(word => !word.startsWith('/')).map(word => word.toLocaleLowerCase('hu-HU'));
    assert.deepEqual(plain.filter(word => !['a', 'az'].includes(word)), [], `Untranscribed words in ${id}: ${plain.join(' ')}`);
    assert.equal(clip.spokenTarget, target, `Manifest input differs: ${id}`);
    assert.equal(clip.spokenText, `Mondjuk együtt: ${target}`);
  }
  assert.equal(phoneticReworkText('chess_start', 'Ismerkedjünk!'), null);
});

test('the rework list never overlaps the older scoped lists, so paid inputs stay unchanged', () => {
  for (const id of REWORK_PHONETIC_IDS) {
    assert.ok(!CHESS_PHONETIC_IDS.includes(id) && !ENGINEERING_PHONETIC_IDS.includes(id), id);
  }
});

test('reviewed words mark Hungarian vowel length, clusters and assimilation', () => {
  assert.equal(REWORK_WORD_IPA.hallgasd, 'ˈhɒlːɡɒʒd');
  assert.equal(REWORK_WORD_IPA.elakadt, 'ˈɛlɒkɒtː');
  assert.equal(REWORK_WORD_IPA.rakd, 'rɒɡd');
  assert.equal(REWORK_WORD_IPA.házhoz, 'ˈhaːshoz');
  assert.equal(REWORK_WORD_IPA.nyithatja, 'ˈɲithɒcːɒ');
  assert.equal(REWORK_WORD_IPA.gyűjteményben, 'ˈɟyːjtɛmeːɲbɛn');
  assert.equal(REWORK_WORD_IPA.kettő, 'ˈkɛtːøː');
  assert.equal(phoneticReworkText('patterns_gap', 'Melyik hiányzik a sorból?'), '/ˈmɛjik/ /ˈhijaːɲzik/ a /ˈʃorboːl/?');
});
