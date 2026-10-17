import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { words, wordCategories, twoWordPhrases, teddyRequests } from '../game-data.js';
import { VOICE_CLIPS } from '../voice-library.js';
import { VOICE_TIMING } from '../voice-timing.js';

import { dressItems, DRESS_CLIPS } from '../dress-data.js';
import { TEDDY_CLIPS } from '../teddy-data.js';
import { ANIMAL_BOOK_CLIPS } from '../animal-book-data.js';
import { PORTAL_CLIPS } from '../portal-practice-data.js';
import { MESE_CLIPS } from '../meseliget-data.js';
import { LOGIC_CLIPS } from '../logic-voice.js';
import { MEMORY_CLIPS } from '../memory-data.js';
import { PUZZLE_CLIPS } from '../puzzle-data.js';
import { DIFFERENCE_CLIPS } from '../differences-voice.js';
import { PATTERN_CLIPS } from '../patterns-voice.js';
import { MONTESSORI_CLIPS } from '../montessori-data.js';
import { CHESS_CLIPS } from '../chess-data.js';
import { CHESS_PHONETIC_IDS, phoneticChessText } from '../chess-voice-pronunciation.js';
import { WORKSHOP_CLIPS } from '../workshop-voice.js';
import { POUR_CLIPS } from '../pour-data.js';
import { R_CLIPS } from '../r-practice-voice.js';
import { STORY_CLIPS } from '../city-story-data.js';

const uniqueIds = (items, label) => assert.equal(new Set(items.map(item => item.id)).size, items.length, `Duplicate ${label} ID`);
uniqueIds(words, 'word');
uniqueIds(wordCategories, 'category');
uniqueIds(twoWordPhrases, 'phrase');
const wordIds = new Set(words.map(word => word.id));
for (const category of wordCategories) {
  assert.ok(category.words.length, `Empty category: ${category.id}`);
  assert.equal(new Set(category.words).size, category.words.length, `Repeated word: ${category.id}`);
  for (const id of category.words) assert.ok(wordIds.has(id), `Unknown word: ${id}`);
}
const manifest = JSON.parse(await readFile(new URL('../audio/voice/manifest.json', import.meta.url), 'utf8'));
const generated = JSON.parse(await readFile(new URL('../audio/voice/generated.json', import.meta.url), 'utf8'));
const voiceConfig = JSON.parse(await readFile(new URL('../voice-config.json', import.meta.url), 'utf8'));
const pronunciation = JSON.parse(await readFile(new URL('../voice-pronunciation.json', import.meta.url), 'utf8'));
assert.equal(pronunciation.model_id, voiceConfig.model_id, 'Pronunciation/model mismatch');
assert.equal(pronunciation.language_code, voiceConfig.language_code, 'Pronunciation/language mismatch');
assert.equal(manifest.version, 2, 'Unknown voice manifest version');
assert.equal(generated.version, 2, 'Unknown voice generation receipt version');
assert.deepEqual(generated.config, voiceConfig, 'Stale voice generation settings');
for (const [key, value] of Object.entries(voiceConfig)) assert.deepEqual(manifest[key], value, `Stale voice setting: ${key}`);
const sha256 = value => createHash('sha256').update(value).digest('hex');
uniqueIds(manifest.clips, 'voice');
assert.deepEqual(VOICE_CLIPS, Object.fromEntries(manifest.clips.map(({id,text,file}) => [id,{text,file}])));
for (const word of words) assert.equal(VOICE_CLIPS[`word_${word.id}`]?.text, word.label);
for (const phrase of twoWordPhrases) assert.equal(VOICE_CLIPS[`phrase_${phrase.id}`]?.text, phrase.text);
for (const [id, text] of Object.entries(teddyRequests)) {
  assert.ok(wordCategories.find(category => category.id === 'food').words.includes(id), `Not a food: ${id}`);
  assert.equal(VOICE_CLIPS[`teddy_${id}`]?.text, text);
}
for (const source of [DRESS_CLIPS,TEDDY_CLIPS,ANIMAL_BOOK_CLIPS,PORTAL_CLIPS]) for (const [id,text] of Object.entries(source)) assert.equal(VOICE_CLIPS[id]?.text,text);
for (const [id, text] of Object.entries(LOGIC_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(MEMORY_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(PUZZLE_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(DIFFERENCE_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(PATTERN_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(MONTESSORI_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(CHESS_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
assert.equal(new Set(CHESS_PHONETIC_IDS).size, CHESS_PHONETIC_IDS.length, 'Repeated new chess voice ID');
for (const id of CHESS_PHONETIC_IDS) {
  const clip = manifest.clips.find(clip => clip.id === id);
  assert.equal(clip?.text, CHESS_CLIPS[id], `Missing new chess voice: ${id}`);
  assert.equal(clip.spokenTarget, phoneticChessText(id, clip.text, pronunciation.words), `Stale chess IPA: ${id}`);
  assert.ok(clip.spokenTarget.includes('/'), `Missing chess IPA: ${id}`);
  assert.equal(clip.spokenText.slice(clip.extract.from, clip.extract.to), clip.spokenTarget, `Wrong chess speech excerpt: ${id}`);
  const displayed = clip.text.match(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu) || [];
  const spoken = clip.spokenTarget.match(/\/[^/\n]+\/|[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu) || [];
  assert.equal(spoken.length, displayed.length, `Chess IPA changed word positions: ${id}`);
}
for (const [id, text] of Object.entries(WORKSHOP_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(POUR_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(R_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(STORY_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
uniqueIds(dressItems, 'dress');
for (const [id, text] of Object.entries(MESE_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const item of dressItems) {
  assert.equal(VOICE_CLIPS[`dress_request_${item.id}`]?.text, item.request);
  assert.equal(VOICE_CLIPS[`dress_thanks_${item.id}`]?.text, item.thanks);
}
const audioFiles = [...words.map(word => `audio/${word.id}.mp3`), ...manifest.clips.map(clip => clip.file)];
for (const file of audioFiles) {
  assert.ok((await stat(new URL(`../${file}`, import.meta.url))).size > 1000, `Missing or empty audio: ${file}`);
}
for (const clip of manifest.clips) {
  const receipt = generated.clips[clip.id];
  const fingerprintInput = [voiceConfig, clip.spokenText || clip.text, ...(clip.extract ? [clip.extract] : [])];
  assert.equal(receipt?.fingerprint, sha256(JSON.stringify(fingerprintInput)), `Stale spoken text: ${clip.id}. Run npm run generate-voice.`);
  assert.equal(receipt?.sha256, sha256(await readFile(new URL(`../${clip.file}`, import.meta.url))), `Unverified voice file: ${clip.id}. Run npm run generate-voice.`);
  assert.deepEqual(VOICE_TIMING[clip.id], receipt.words, `Stale speech timing: ${clip.id}`);
  assert.ok(receipt.words?.length, `Missing word timing: ${clip.id}`);
  const sourceWords = clip.text.match(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu);
  for (const [word, ipa] of Object.entries(pronunciation.words)) {
    const count = sourceWords.filter(value => value.toLocaleLowerCase('hu-HU') === word).length;
    if (count) assert.equal((clip.spokenTarget || '').split(`/${ipa}/`).length - 1, count, `Missing pronunciation correction for ${word}: ${clip.id}`);
  }
  assert.deepEqual(receipt.words.map(word => word[2]), sourceWords, `Incomplete spoken text: ${clip.id}`);
  assert.ok(Number.isFinite(receipt.duration) && receipt.duration > .2, `Invalid audio duration: ${clip.id}`);
  assert.ok(receipt.words.at(-1)[1] <= receipt.duration + .001, `Missing final word: ${clip.id}`);
  for (const [i, word] of receipt.words.entries()) {
    assert.ok(word.length === 3 && Number.isFinite(word[0]) && word[0] >= 0 && Number.isFinite(word[1]) && word[1] >= word[0] && typeof word[2] === 'string', `Invalid timing: ${clip.id}`);
    if (i) assert.ok(word[0] >= receipt.words[i-1][0], `Unordered timing: ${clip.id}`);
  }
}
console.log(`Content ready: ${words.length} words, ${twoWordPhrases.length} phrases, ${audioFiles.length} audio files.`);
