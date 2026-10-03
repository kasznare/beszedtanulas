import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { words, wordCategories, twoWordPhrases, teddyRequests } from '../game-data.js';
import { VOICE_CLIPS } from '../voice-library.js';

import { dressItems } from '../dress-data.js';
import { MESE_CLIPS } from '../meseliget-data.js';
import { LOGIC_CLIPS } from '../logic-voice.js';
import { MEMORY_CLIPS } from '../memory-data.js';
import { WORKSHOP_CLIPS } from '../workshop-voice.js';

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
assert.equal(generated.version, 1, 'Unknown voice generation receipt version');
const sha256 = value => createHash('sha256').update(value).digest('hex');
uniqueIds(manifest.clips, 'voice');
assert.deepEqual(VOICE_CLIPS, Object.fromEntries(manifest.clips.map(({id,text,file}) => [id,{text,file}])));
for (const word of words) assert.equal(VOICE_CLIPS[`word_${word.id}`]?.text, word.label);
for (const phrase of twoWordPhrases) assert.equal(VOICE_CLIPS[`phrase_${phrase.id}`]?.text, phrase.text);
for (const [id, text] of Object.entries(teddyRequests)) {
  assert.ok(wordCategories.find(category => category.id === 'food').words.includes(id), `Not a food: ${id}`);
  assert.equal(VOICE_CLIPS[`teddy_${id}`]?.text, text);
}
for (const [id, text] of Object.entries(LOGIC_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(MEMORY_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
for (const [id, text] of Object.entries(WORKSHOP_CLIPS)) assert.equal(VOICE_CLIPS[id]?.text, text);
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
  assert.equal(receipt?.fingerprint, sha256(JSON.stringify([manifest.voice, manifest.rate, clip.text])), `Stale spoken text: ${clip.id}. Run npm run generate-voice.`);
  assert.equal(receipt?.sha256, sha256(await readFile(new URL(`../${clip.file}`, import.meta.url))), `Unverified voice file: ${clip.id}. Run npm run generate-voice.`);
}
console.log(`Content ready: ${words.length} words, ${twoWordPhrases.length} phrases, ${audioFiles.length} audio files.`);
