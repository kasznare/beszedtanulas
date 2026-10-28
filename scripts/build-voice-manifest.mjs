import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { validateVoiceRepairs, applyBoundedExcerpts } from './voice-repairs.mjs';
import { words, twoWordPhrases, teddyRequests } from '../game-data.js';

import { DRESS_CLIPS } from '../dress-data.js';
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
import { ENGINEERING_CLIPS } from '../engineering-data.js';
import { ENGINEERING_PHONETIC_IDS, phoneticEngineeringText } from '../engineering-voice-pronunciation.js';
import { REWORK_PHONETIC_IDS, phoneticReworkText } from '../rework-voice-pronunciation.js';
import { WORKSHOP_CLIPS } from '../workshop-voice.js';
import { POUR_CLIPS } from '../pour-data.js';
import { R_CLIPS } from '../r-practice-voice.js';
import { STORY_CLIPS } from '../city-story-data.js';

export async function compileVoiceManifest({ repairs } = {}) {
const clips = [];
// A terminal period gives isolated words/numbers a complete spoken ending.
// Keep displayed text unchanged, and fingerprint the actual provider input.
const add = (id, text, group = 'guide') => clips.push({ id, text,
  ...(!/[.!?…]$/.test(text) ? { spokenText: `${text}.` } : {}),
  group, file: `audio/voice/${id}.mp3` });
const guides = {
  welcome: 'Szia! Kezdődhet a játék. Válassz egy képet!',
  play_menu: 'Etessük meg a macit, vagy nézzük meg, mi bújt el!',
  play_menu_more: 'Etessük meg a macit, öltöztessük fel, vagy nézzük meg, mi bújt el!',
  menu_pictures: 'Képek és hangok. Nézegessünk képeket, keressünk hang után, vagy lapozzuk az állatkönyvet!',
  menu_speech: 'Mondjuk együtt! Válassz szavakat, rövid kifejezést vagy a róka R-kalandját!',
  menu_thinking: 'Számoljunk, figyeljük a mintákat, és oldjunk meg fejtörőket! Válassz egy játékot!',
  menu_stories: 'Hallgassunk mesét, vagy játsszunk a macival! Válassz egy képet!',
  menu_activity: 'Keress képpárokat, rakj össze egy képet, fedezd fel a Montessori műhelyt, vagy tölts a barátainknak! Válassz egy játékot!',
  dress: 'Sétálni szeretnék! Segíts felöltözni! Koppints arra, amit kérek!',
  dress_finished: 'Felöltöztem! Köszönöm! Indulhat a séta!',
  teddy: 'Megéheztem! Hallgasd meg, mit kérek, és koppints a finomságra!',
  teddy_thanks: 'De finom! Köszönöm!',
  teddy_finished: 'Tele a pocakom! Köszönöm a finom pikniket!',
  topics: 'Itt vannak a képek. Válassz egyet!',
  picture_menu: 'Itt képeket nézegethetünk, és szavakat hallgathatunk. Válassz egy játékot!',
  listening_game: 'Hallgasd meg a szót, és keresd meg a képét!',
  cards: 'Koppints egy képre! Hallgassuk meg együtt!',
  practice: 'Egy szóval vagy két szóval is gyakorolhatunk. Válassz egy képet!',
  imitate: 'Hallgasd meg a szót, és mondd utánam!',
  phrase: 'Hallgasd meg, és mondd utánam a két szót!',
  number_menu: 'Itt együtt számolunk. Válassz egy játékot!',
  count: 'Koppints a tárgyakra! Számoljuk meg őket együtt!',
  quiz: 'Hallgasd meg, melyik képet keressük. Koppints rá!',
  flip: 'A kártya mögött egy kép bújik meg. Koppints rá!',
  listening: 'Most te jössz!',
  again: 'Próbáljuk meg együtt!',
  good: 'Ez az! Ügyes vagy!',
  finished: 'De jó volt együtt játszani! Újabb kör vár rád.',
  mic_help: 'Kérj meg egy felnőttet, hogy kapcsolja be a mikrofont!',
  goodbye: 'Válasszunk egy másik játékot!',
  one_word: 'Egy szó.',
  two_words: 'Két szó.',
  family: 'Család.',
  animals: 'Állatok.',
  food: 'Finomságok.',
  play: 'Játék és utazás.',
  nature: 'Természet.',
  home: 'Otthon.',
  retry_count: 'Próbáld újra! Számold meg egyesével.',
};
for (const [id, text] of Object.entries(guides)) add(`guide_${id}`, text);
for (const [group, source] of Object.entries({dress:DRESS_CLIPS,teddy:TEDDY_CLIPS,'animal-book':ANIMAL_BOOK_CLIPS,portal:PORTAL_CLIPS})) for (const [id,text] of Object.entries(source)) add(id,text,group);
for (const [id, text] of Object.entries(LOGIC_CLIPS)) add(id, text, 'logic');
for (const [id, text] of Object.entries(MEMORY_CLIPS)) add(id, text, 'memory');
for (const [id, text] of Object.entries(PUZZLE_CLIPS)) add(id, text, 'puzzle');
for (const [id, text] of Object.entries(DIFFERENCE_CLIPS)) add(id, text, 'differences');
for (const [id, text] of Object.entries(PATTERN_CLIPS)) add(id, text, 'patterns');
for (const [id, text] of Object.entries(MONTESSORI_CLIPS)) add(id, text, 'montessori');
for (const [id, text] of Object.entries(CHESS_CLIPS)) add(id, text, 'chess');
for (const [id, text] of Object.entries(ENGINEERING_CLIPS)) add(id, text, 'engineering');
for (const [id, text] of Object.entries(WORKSHOP_CLIPS)) add(id, text, 'workshop');
for (const [id, text] of Object.entries(POUR_CLIPS)) add(id, text, 'pour');
for (const [id, text] of Object.entries(R_CLIPS)) add(id, text, 'r-practice');
for (const [id, text] of Object.entries(MESE_CLIPS)) add(id, text, 'meseliget');
for (const [id, text] of Object.entries(STORY_CLIPS)) add(id, text, 'city-story');
for (const [id, text] of Object.entries(teddyRequests)) add(`teddy_${id}`, text, 'teddy');
for (const word of words) add(`word_${word.id}`, word.label, 'word');
for (const phrase of twoWordPhrases) add(`phrase_${phrase.id}`, phrase.text, 'phrase');
const names = ['nulla', 'egy', 'kettő', 'három', 'négy', 'öt', 'hat', 'hét', 'nyolc', 'kilenc', 'tíz'];
for (let n = 1; n <= 10; n++) {
  add(`number_${n}`, names[n], 'number');
  for (const object of words.filter(w => ['alma', 'labda', 'auto'].includes(w.id))) {
    const quantity = `${n === 2 ? 'két' : names[n]} ${object.label}`;
    add(`quantity_${object.id}_${n}`, quantity, 'number');
    add(`question_${object.id}_${n}`, `Ezen a képen ${quantity} van. Keresd meg!`, 'number');
  }
}
// Native Hungarian context prevents English readings of isolated c/s/vowels.
// The app hears only the target; the prefix is retained solely in the paid cache.
for (const clip of clips) {
  const word = /^(word_|r_word_|r_puzzle_word_)/.test(clip.id);
  const number = /^(number_|logic_n_|workshop_n_)/.test(clip.id);
  if (!word && !number) continue;
  const prefix = number ? 'A szám: ' : ['szia','gyere'].includes(clip.text) ? 'Mondjuk együtt: ' : clip.text === 'perec' ? 'Egy finom ' : 'Ez egy ';
  Object.assign(clip, {
    spokenText: `${prefix}${clip.text}.`,
    extract: { from: prefix.length, to: prefix.length + clip.text.length, before: 0.025, after: 0.15 },
  });
}
// Reuse the acoustic variants that the local audit recognized exactly.
for (const [id, prefix] of [['r_word_rizs', 'forró '], ['r_word_dinnye', 'érett ']]) {
  const clip = clips.find(clip => clip.id === id);
  clip.spokenText = `${prefix}${clip.text}.`;
  clip.extract = { from: prefix.length, to: prefix.length + clip.text.length, before: 0.025, after: 0.15 };
}
for (const id of ['word_cipo','r_word_cipo']) {
  const shoe=clips.find(clip=>clip.id===id);
  if(shoe){shoe.spokenText='cipő.';delete shoe.extract;}
}
const contextual = (id, prefix, target) => {
  const clip = clips.find(clip => clip.id === id);
  target ??= clip.text;
  clip.spokenText = `${prefix}${target}${/[.!?…]$/.test(target) ? '' : '.'}`;
  clip.extract = { from: prefix.length, to: prefix.length + target.length, before: 0.025, after: 0.15 };
  if (target !== clip.text) {
    clip.spokenTarget = target;
    clip.extract.text = clip.text;
  }
};
// The model otherwise treats Hungarian ck as English ck. tsz preserves /ts/.
contextual('r_word_barack', 'Ez egy ', 'baratszk');
contextual('r_phrase_barack', 'A gyümölcs: ', 'érett baratszk');
for (const id of ['r_rhyme_roka_1', 'r_rhyme_kert_1', 'r_rhyme_robot_0']) contextual(id, 'Mondjuk együtt: ');
contextual('r_rhyme_roka_2', 'Mondjuk együtt: ', 'Ropi roppan, peretsz kerek.');
// v4 understands /IPA/ directly. Keep pronunciation and displayed Hungarian
// spelling separate, so all occurrences and future regenerations stay corrected.
const pronunciation = JSON.parse(await readFile(new URL('../voice-pronunciation.json', import.meta.url), 'utf8'));
const config = JSON.parse(await readFile(new URL('../voice-config.json', import.meta.url), 'utf8'));
if (pronunciation.model_id !== config.model_id || pronunciation.language_code !== config.language_code) throw Error('Pronunciation rules do not match the voice model/language');
for (const clip of clips) {
  const original = clip.spokenTarget || clip.text;
  const target = original.replace(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu, word => {
    const ipa = pronunciation.words[word.toLocaleLowerCase('hu-HU')];
    return ipa ? `/${ipa}/` : word;
  });
  if (target !== original) contextual(clip.id, 'Mondjuk együtt: ', target);
}
// Scope new chess pronunciation to new IDs. Never change old paid inputs.
if (config.model_id !== 'eleven_v4') throw Error('Chess IPA requires Eleven v4');
for (const id of CHESS_PHONETIC_IDS) {
  const clip = clips.find(clip => clip.id === id);
  if (!clip || clip.group !== 'chess') throw Error(`Missing new chess clip: ${id}`);
  const target = phoneticChessText(id, clip.text, pronunciation.words);
  if (target === clip.text || !target?.includes('/')) throw Error(`Missing chess IPA: ${id}`);
  contextual(id, 'Mondjuk együtt: ', target);
}
// New engineering recordings use their own phonetic targets; existing voices
// and the global pronunciation list stay byte-for-byte unchanged.
for (const id of ENGINEERING_PHONETIC_IDS) {
  const clip = clips.find(clip => clip.id === id);
  if (!clip || clip.group !== 'engineering') throw Error(`Missing engineering clip: ${id}`);
  const target = phoneticEngineeringText(id, clip.text, pronunciation.words);
  if (target === clip.text || !target?.includes('/')) throw Error(`Missing engineering IPA: ${id}`);
  contextual(id, 'Mondjuk együtt: ', target);
}
// The 2026 rework lines are pronounced from their own scoped list, so the older
// chess and engineering inputs stay byte-for-byte unchanged.
for (const id of REWORK_PHONETIC_IDS) {
  const clip = clips.find(clip => clip.id === id);
  if (!clip) throw Error(`Missing rework clip: ${id}`);
  const target = phoneticReworkText(id, clip.text, pronunciation.words);
  if (target === clip.text || !target?.includes('/')) throw Error(`Missing rework IPA: ${id}`);
  contextual(id, 'Mondjuk együtt: ', target);
}
repairs ??= JSON.parse(await readFile(new URL('../voice-repairs.json', import.meta.url), 'utf8'));
validateVoiceRepairs(repairs, config, clips);
for (const [id, repair] of Object.entries(repairs.clips)) {
  contextual(id, 'Mondjuk együtt: ', repair.spokenTarget);
  const clip = clips.find(clip => clip.id === id);
  clip.spokenTarget = repair.spokenTarget;
  clip.extract.text = clip.text;
}
// These new requests already exist as Maci's correctly inflected full models.
// Reuse the paid recordings, including their character timings, for both modes.
for (const [phraseId, food] of [['kerek_almat','alma'],['kerek_tejet','tej'],['kerek_kiflit','kifli'],['kerek_kenyeret','kenyer']]) {
  const clip=clips.find(c=>c.id===`phrase_${phraseId}`), source=clips.find(c=>c.id===`teddy_${food}`);
  if (Object.hasOwn(repairs.clips, clip.id)) continue;
  clip.spokenText=source.spokenText||source.text;
  clip.spokenTarget=(source.spokenTarget||source.text).replace(/[.!?]$/, '');
  clip.extract={from:source.extract?.from||0,to:(source.extract?.from||0)+clip.spokenTarget.length,before:.025,after:.15,text:clip.text};
}
// Short practice parts use the same audited pronunciation as their full model.
// The generator cuts them at the provider's character timings, without a new request.
const displayTokens = text => [...text.matchAll(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu)];
const spokenTokens = text => [...text.matchAll(/\/[^/]+\/|[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu)];
function excerptFrom(clip, source) {
  if (Object.hasOwn(repairs.clips, clip.id)) return;
  const target = displayTokens(clip.text), display = displayTokens(source.text);
  const start = display.findIndex((_, i) => target.every((word, j) => display[i+j]?.[0].toLocaleLowerCase('hu-HU') === word[0].toLocaleLowerCase('hu-HU')));
  if (start < 0) throw Error(`Missing excerpt: ${clip.id} in ${source.id}`);
  const spoken = source.spokenTarget || source.text, tokens = spokenTokens(spoken);
  if (tokens.length !== display.length) throw Error(`Excerpt word mismatch: ${source.id}`);
  const first = tokens[start], last = tokens[start + target.length - 1];
  const offset = source.extract?.from || 0;
  clip.spokenText = source.spokenText || source.text;
  clip.spokenTarget = spoken.slice(first.index, last.index + last[0].length);
  clip.extract = {from:offset+first.index,to:offset+last.index+last[0].length,before:0.025,after:0.12,text:clip.text};
}
// New visual-game cues reuse already recorded phrases; no new paid speech.
for (const [id, sourceId] of Object.entries({ patterns_start: 'workshop_pattern_1', patterns_hint: 'workshop_pattern_hint1', patterns_retry: 'workshop_pattern_retry', patterns_done: 'workshop_pattern_done', differences_start: 'flip_missing', differences_hint: 'abk_try_again', differences_done: 'memory_done' })) {
  excerptFrom(clips.find(clip => clip.id === id), clips.find(clip => clip.id === sourceId));
}
for (const clip of clips) {
  const rhyme = /^r_rhyme_part_(.+)_(\d+)_(\d+)$/.exec(clip.id);
  const phrase = /^phrase_part_(.+)_(\d+)$/.exec(clip.id);
  if (rhyme) excerptFrom(clip, clips.find(source => source.id === `r_rhyme_${rhyme[1]}_${rhyme[2]}`));
  else if (phrase) excerptFrom(clip, clips.find(source => source.id === `phrase_${phrase[1]}`));
}
applyBoundedExcerpts(repairs, clips);
return { version: 2, ...config, clips };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
const { values } = parseArgs({ options: { 'output-dir': { type: 'string' } } });
const destination = values['output-dir'] ? resolve(values['output-dir']) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = await compileVoiceManifest();
const { clips } = manifest;
await mkdir(resolve(destination, 'audio/voice'), { recursive: true });
await writeFile(resolve(destination, 'audio/voice/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(resolve(destination, 'voice-library.js'),
  '// Generated by scripts/build-voice-manifest.mjs. Existing family recordings stay in audio/.\n' +
  'export const VOICE_CLIPS = ' + JSON.stringify(Object.fromEntries(clips.map(clip => [clip.id, {text:clip.text, file:clip.file}])), null, 2) + ';\n');
console.log(`${clips.length} voice clips in manifest.`);
}
