import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { words, wordCategories, twoWordPhrases } from '../game-data.js';
import { VOICE_CLIPS } from '../voice-library.js';

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
uniqueIds(manifest.clips, 'voice');
assert.deepEqual(VOICE_CLIPS, Object.fromEntries(manifest.clips.map(({id,text,file}) => [id,{text,file}])));
for (const word of words) assert.equal(VOICE_CLIPS[`word_${word.id}`]?.text, word.label);
for (const phrase of twoWordPhrases) assert.equal(VOICE_CLIPS[`phrase_${phrase.id}`]?.text, phrase.text);
const audioFiles = [...words.map(word => `audio/${word.id}.mp3`), ...manifest.clips.map(clip => clip.file)];
for (const file of audioFiles) {
  assert.ok((await stat(new URL(`../${file}`, import.meta.url))).size > 1000, `Missing or empty audio: ${file}`);
}
console.log(`Content ready: ${words.length} words, ${twoWordPhrases.length} phrases, ${audioFiles.length} audio files.`);
