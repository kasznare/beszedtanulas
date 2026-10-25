// Drives Hol van?/Hangos bingó/Két szó, Mi bújt el? and the memory games through whole rounds on a small DOM.
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { installDom, memoryStorage, flush } from './fixtures/mini-dom.mjs';
import { words } from '../game-data.js';
import { setupListeningGame, LISTENING_LEVELS_KEY, ADVANCE_MS } from '../listening-game.js';
import { setupFlipGame, FLIP_LEVELS_KEY } from '../flip-game.js';
import { setupMemoryGame } from '../memory-game.js';
import { SOUND_MEMORY_KEY } from '../memory-data.js';

const LISTENING_HTML = '<h1 id="screen-title"></h1><section id="listening-game" class="panel is-active"><div id="listening-progress"></div><div class="listening-prompt"><button id="listening-replay"></button></div><div id="listening-answers"></div><p id="listening-status"></p></section>';

function withDom(html, body) {
  return async () => {
    const dom = installDom(html);
    mock.timers.enable({ apis: ['setTimeout'] });
    try { await body(dom); } finally { mock.timers.reset(); dom.restore(); }
  };
}
const tick = async ms => { await flush(); mock.timers.tick(ms); await flush(); };

function listening(dom, options = {}) {
  const log = { prompts: [], spoken: [], completions: [], correct: 0 };
  const storage = options.storage || memoryStorage();
  const game = setupListeningGame({
    getOptions: () => ({ words, allWords: words, length: 5, choiceCount: 2, difficulty: 'different', ...options }),
    setDifficulty() {}, speak: id => { log.spoken.push(id); return Promise.resolve(); },
    playPrompt: item => log.prompts.push(item), playCorrect: () => { log.correct++; return Promise.resolve(); },
    stopPlayback() {}, onComplete: (count, context) => log.completions.push({ count, ...context }), storage,
  });
  const $ = selector => dom.document.querySelector(selector);
  const $$ = selector => dom.document.querySelectorAll(selector);
  return { game, log, storage, $, $$ };
}

test('Hol van? advances by itself, adds a picture after three first-try answers and gives stars for them', withDom(LISTENING_HTML, async dom => {
  const { game, log, $, $$ } = listening(dom);
  game.start({ mode: 'classic', announce: false });
  assert.equal(dom.document.querySelector('#screen-title').textContent, 'Hol van?');
  const counts = [];
  for (let question = 0; question < 5; question++) {
    counts.push($$('.listening-answer').length);
    const target = log.prompts.at(-1);
    $(`.listening-answer[data-word="${target.id}"]`).click();
    assert.ok($(`.listening-answer[data-word="${target.id}"]`).classList.contains('is-correct'));
    if (question === 2) assert.equal($('#listening-status').textContent, 'Megtaláltad! Jön még egy kép.');
    await tick(ADVANCE_MS - 1);
    assert.equal(log.completions.length + log.prompts.length, question + 1, 'nothing happens before the pause ends');
    await tick(1);
  }
  assert.deepEqual(counts, [2, 2, 2, 3, 3]);
  assert.equal(log.completions.length, 1);
  assert.deepEqual([log.completions[0].count, log.completions[0].mode, log.completions[0].firstTry], [5, 'classic', 5]);
  assert.equal($$('.progress-dot.is-star').length, 5);
}));

test('Hol van? removes a picture after two misses and counts only first-try answers as stars', withDom(LISTENING_HTML, async dom => {
  const { game, log, $, $$, storage } = listening(dom, { choiceCount: 3 });
  game.start({ mode: 'classic', announce: false });
  for (let question = 0; question < 5; question++) {
    const target = log.prompts.at(-1);
    if (question < 2) {
      $(`.listening-answer:not([data-word="${target.id}"])`).click();
      assert.ok(log.prompts.at(-1) === target, 'a miss repeats the word');
    }
    $(`.listening-answer[data-word="${target.id}"]`).click();
    await tick(ADVANCE_MS);
    if (question === 1) assert.equal($$('.listening-answer').length, 2, 'two misses close together take a picture away');
  }
  assert.equal(log.completions[0].count, 3);
  assert.equal(JSON.parse(storage.getItem(LISTENING_LEVELS_KEY)).choices, 3, 'three first-try answers after that add it back');
}));

test('a right answer waits while the page is hidden and goes on when it is back', withDom(LISTENING_HTML, async dom => {
  const { game, log, $ } = listening(dom);
  game.start({ mode: 'classic', announce: false });
  const first = log.prompts.at(-1);
  $(`.listening-answer[data-word="${first.id}"]`).click();
  dom.setHidden(true);
  await tick(ADVANCE_MS * 3);
  assert.equal(log.prompts.length, 1);
  dom.setHidden(false);
  await tick(ADVANCE_MS);
  assert.equal(log.prompts.length, 2);
  assert.notEqual(log.prompts.at(-1).id, first.id);
}));

test('Hangos bingó: decide "Nincs nálam" for calls that are not on the board, a full row or column wins', withDom(LISTENING_HTML, async dom => {
  const { game, log, $, $$, storage } = listening(dom);
  game.start({ mode: 'bingo' });
  assert.equal(log.spoken[0], 'listening_bingo_start');
  await flush();
  assert.equal(dom.document.querySelector('#screen-title').textContent, 'Hangos bingó');
  assert.equal($$('.listening-bingo-tile').length, 4);
  assert.ok(!$('#listening-none').hidden);
  const board = $$('.listening-bingo-tile').map(tile => tile.dataset.word);
  let decoys = 0, wrongDone = false;
  for (let step = 0; step < 10 && !log.completions.length; step++) {
    const call = log.prompts.at(-1);
    const tile = $(`.listening-bingo-tile[data-word="${call.id}"]`);
    if (tile) {
      if (!wrongDone) { $('#listening-none').click(); wrongDone = true; assert.ok($('#listening-none').classList.contains('is-retry')); }
      tile.click();
      assert.ok(tile.classList.contains('is-covered'));
    } else {
      decoys++;
      assert.ok(!board.includes(call.id));
      $$('.listening-bingo-tile:not(:disabled)')[0].click();
      assert.equal(log.completions.length, 0);
      $('#listening-none').click();
      assert.match($('#listening-status').textContent, /nincs nálad/);
    }
    await tick(ADVANCE_MS);
  }
  assert.ok(decoys >= 1, 'at least one call was not on the board');
  assert.equal(log.completions.length, 1);
  assert.equal($$('.listening-bingo-tile.is-line').length, 2);
  assert.equal(log.completions[0].mode, 'bingo');
  assert.equal(log.completions[0].count, 5 - log.completions[0].misses);
  assert.ok(log.completions[0].misses >= 2);
  assert.equal(JSON.parse(storage.getItem(LISTENING_LEVELS_KEY)).bingoSize, 2, 'a game with mistakes keeps the 2×2 board');
}));

test('a clean 2×2 bingo opens the 3×3 board next time', withDom(LISTENING_HTML, async dom => {
  const { game, log, $, $$ } = listening(dom);
  game.start({ mode: 'bingo', announce: false });
  for (let step = 0; step < 10 && !log.completions.length; step++) {
    const call = log.prompts.at(-1);
    ($(`.listening-bingo-tile[data-word="${call.id}"]`) || $('#listening-none')).click();
    await tick(ADVANCE_MS);
  }
  assert.equal(log.completions[0].count, 5);
  game.start({ mode: 'bingo', announce: false });
  assert.equal($$('.listening-bingo-tile').length, 9);
  $('[data-bingo-size="2"]').click();
  assert.equal($$('.listening-bingo-tile').length, 4, 'the board size can also be chosen');
}));

test('Két szó plays two-word phrases and asks between look-alike pictures', withDom(LISTENING_HTML, async dom => {
  const { game, log, $, $$ } = listening(dom, { length: 3 });
  game.start({ mode: 'phrase', announce: false });
  assert.equal(dom.document.querySelector('#screen-title').textContent, 'Két szó');
  assert.ok($('.listening-similarity').hidden);
  for (let question = 0; question < 3; question++) {
    const target = log.prompts.at(-1);
    assert.equal(target.kind, 'phrase');
    assert.ok($$('.listening-phrase').length >= 2);
    $(`.listening-answer[data-word="${target.id}"]`).click();
    await tick(ADVANCE_MS);
  }
  assert.deepEqual([log.completions[0].mode, log.completions[0].count], ['phrase', 5]);
}));

const FLIP_HTML = '<h1 id="screen-title"></h1><section id="flip" class="panel is-active"></section>';
function flip(dom, flipMode, storage = memoryStorage()) {
  const log = { spoken: [], played: [], completions: [] };
  const game = setupFlipGame({
    getOptions: () => ({ words, allWords: words, flipMode }), setMode() {},
    playWord: word => { log.played.push(word.id); return Promise.resolve(); },
    speak: ids => { log.spoken.push(ids); return Promise.resolve(); }, stopPlayback() {},
    onComplete: (count, context) => log.completions.push({ count, ...context }), storage,
  });
  return { game, log, storage, $: s => dom.document.querySelector(s), $$: s => dom.document.querySelectorAll(s) };
}

test('Mi hiányzik?: the hidden card leaves, the rest move, and five questions grow the board', withDom(FLIP_HTML, async dom => {
  const { game, log, storage, $, $$ } = flip(dom, 'missing');
  game.start();
  const sizes = [];
  for (let question = 0; question < 5; question++) {
    const shown = $$('[data-flip-index]').map(card => card.dataset.word);
    sizes.push(shown.length);
    $('#flip-hide').click();
    assert.equal($$('.flip-card.is-open').length, 0, 'the cards are covered first');
    await tick(750);
    const remaining = $$('[data-flip-index]').map(card => card.dataset.word);
    const hidden = shown.filter(id => !remaining.includes(id));
    assert.equal(remaining.length + hidden.length, shown.length);
    const options = $$('[data-missing-answer]').map(button => button.dataset.missingAnswer);
    assert.equal(options.length, hidden.length + 2);
    assert.ok(options.every(id => !remaining.includes(id)), 'no visible card among the answers');
    dom.setHidden(true); dom.setHidden(false);
    assert.deepEqual($$('[data-missing-answer]').map(button => button.dataset.missingAnswer), options, 'answers keep their places after a re-render');
    for (const id of hidden) $(`[data-missing-answer="${id}"]`).click();
    assert.ok($$('.flip-card.is-returned').length === hidden.length, 'the hidden pictures come back');
    await tick(900);
  }
  assert.deepEqual(sizes, [3, 4, 5, 6, 6]);
  assert.deepEqual([log.completions[0].count, log.completions[0].mode], [5, 'missing']);
  assert.equal(JSON.parse(storage.getItem(FLIP_LEVELS_KEY)).kimStart, 2);
}));

test('Mi hiányzik?: a wrong answer stays a choice, costs the star and does not grow the board', withDom(FLIP_HTML, async dom => {
  const { game, log, $, $$ } = flip(dom, 'missing');
  game.start();
  for (let question = 0; question < 5; question++) {
    const shown = $$('[data-flip-index]').map(card => card.dataset.word);
    assert.equal(shown.length, 3);
    $('#flip-hide').click(); await tick(750);
    const remaining = $$('[data-flip-index]').map(card => card.dataset.word);
    const hidden = shown.find(id => !remaining.includes(id));
    const wrong = $$('[data-missing-answer]').find(button => button.dataset.missingAnswer !== hidden);
    wrong.click();
    assert.ok(wrong.classList.contains('is-retry'));
    assert.equal($('#flip-status').textContent, 'Ez nem volt a képek között.');
    assert.ok(log.spoken.includes('flip_retry'));
    $(`[data-missing-answer="${hidden}"]`).click();
    await tick(900);
  }
  assert.equal(log.completions[0].count, 1);
}));

test('Hol bújt el?: first-try finds become stars and a good round grows the deck 4→6→8', withDom(FLIP_HTML, async dom => {
  const storage = memoryStorage();
  for (const [size, mistakes, stars] of [[4, 0, 5], [6, 1, 4], [8, 0, 5], [8, 5, 2]]) {
    const { game, log, $, $$ } = flip(dom, 'find', storage);
    game.start();
    assert.equal($$('[data-flip-index]').length, size);
    $('#flip-hide').click();
    let made = 0;
    for (let found = 0; found < size; found++) {
      const target = log.spoken.at(-1)[1].replace('word_', '');
      const cards = $$('[data-flip-index]');
      if (made < mistakes) {
        cards.find(card => card.dataset.word !== target && !card.classList.contains('is-success')).click();
        await flush(); await tick(1100); made++;
      }
      $(`[data-flip-index][data-word="${target}"]`).click();
    }
    assert.equal(log.completions.at(-1).count, stars, `${size} cards, ${mistakes} misses`);
    game.stop();
  }
  assert.equal(JSON.parse(storage.getItem(FLIP_LEVELS_KEY)).findSize, 6, 'five misses of eight step back');
}));

const MEMORY_HTML = '<h1 id="screen-title"></h1><section id="memory" class="panel is-active"></section>';
function memory(dom, extra = {}) {
  const log = { spoken: [], played: [], animals: [], completions: [], pairs: [] };
  const storage = extra.storage || memoryStorage();
  let pairs = extra.pairs || 2;
  const game = setupMemoryGame({
    getOptions: () => ({ words: words.slice(0, 2), allWords: words, memoryPairs: pairs }),
    playWord: word => { log.played.push(word.id); return Promise.resolve(); },
    playAnimal: id => { log.animals.push(id); return Promise.resolve(true); },
    speak: id => { log.spoken.push(id); return Promise.resolve(); }, stopPlayback() {},
    setPairs: value => { pairs = value; log.pairs.push(value); },
    onComplete: (count, context) => log.completions.push({ count, ...context }), storage,
  });
  return { game, log, storage, $: s => dom.document.querySelector(s), $$: s => dom.document.querySelectorAll(s) };
}

test('Képpárok: one shared look per round, praise per pair, and a good round opens the next size', withDom(MEMORY_HTML, async dom => {
  const { game, log, $, $$ } = memory(dom);
  game.start({ mode: 'classic' });
  assert.equal($('#screen-title').textContent, 'Képpárok');
  assert.equal($$('[data-pairs]').length, 0, 'no pair-count menu for the child');
  assert.equal($$('[data-card]').length, 4, 'a two-word topic is filled to the level');
  $('#memory-hint').click();
  assert.equal($$('.memory-card.is-open').length, 4);
  $('#memory-hint').click();
  assert.equal($$('.memory-card.is-open').length, 0);
  assert.ok($('#memory-hint').disabled, 'the look is used up for this round');
  const keys = $$('[data-card]').map(card => card.dataset.card);
  const word = key => key.slice(0, key.lastIndexOf('-'));
  const first = keys[0], other = keys.find(key => word(key) !== word(first));
  $(`[data-card="${first}"]`).click(); $(`[data-card="${other}"]`).click();
  assert.equal($$('[data-card]:not(:disabled)').length, 0, 'a mismatch locks the board while it shows');
  await tick(1100);
  for (const id of new Set(keys.map(word))) {
    for (const key of keys.filter(k => word(k) === id)) $(`[data-card="${key}"]`).click();
    await flush();
  }
  assert.equal(log.spoken.filter(id => id === 'memory_match').length, 1, 'praise after the first pair; the round dialog covers the last');
  assert.ok(!log.spoken.includes('memory_done'), 'the game does not say memory_done itself');
  assert.deepEqual([log.completions[0].count, log.completions[0].mismatches, log.completions[0].mode], [5, 1, 'classic']);
  assert.deepEqual(log.pairs, [3]);
  game.start();
  assert.equal($$('[data-card]').length, 6);
  assert.ok(!$('#memory-hint').disabled, 'a new round has a new look');
}));

test('Hang–kép párok: face-down cards play animal sounds or names and pair a sound with its partner', withDom(MEMORY_HTML, async dom => {
  const storage = memoryStorage();
  const { game, log, $, $$ } = memory(dom, { storage });
  game.start({ mode: 'sound' });
  assert.equal($('#screen-title').textContent, 'Hang–kép párok');
  assert.equal(log.spoken.at(-1), 'memory_sound_start');
  const keys = $$('[data-card]').map(card => card.dataset.card);
  assert.equal(keys.length, 6);
  assert.equal($$('.memory-card.is-open').length, 0, 'every card starts face down');
  // Learn the cards the way a child does: two at a time, then match what was heard.
  const known = new Map();
  const reveal = async key => {
    const before = log.animals.length, spoken = log.spoken.length;
    $(`[data-card="${key}"]`).click();
    await flush();
    const sound = log.animals.length > before ? log.animals.at(-1) : null;
    const name = log.spoken.slice(spoken).find(id => id.startsWith('abk_name_'))?.slice(9);
    known.set(key, { id: sound || name, kind: sound ? 'sound' : 'picture' });
    if (!sound) assert.ok($(`[data-card="${key}"]`).querySelector('.word-picture'), 'the picture card shows the animal');
    else if (!$(`[data-card="${key}"]`).classList.contains('is-matched')) assert.equal($(`[data-card="${key}"] .memory-kind-icon`).textContent, '🔊', 'the sound card does not show the animal');
  };
  for (let i = 0; i < keys.length && !log.completions.length; i += 2) {
    await reveal(keys[i]);
    const partner = [...known].find(([key, card]) => key !== keys[i] && card.id === known.get(keys[i]).id && !$(`[data-card="${key}"]`).classList.contains('is-matched'));
    if (partner) { $(`[data-card="${partner[0]}"]`).click(); await flush(); i--; continue; }
    if (!keys[i + 1]) break;
    await reveal(keys[i + 1]);
    if (!$(`[data-card="${keys[i + 1]}"]`).classList.contains('is-matched')) await tick(1100);
  }
  for (const [key, card] of known) {
    if (log.completions.length || $(`[data-card="${key}"]`).classList.contains('is-matched')) continue;
    const partner = [...known].find(([k, c]) => k !== key && c.id === card.id);
    $(`[data-card="${key}"]`).click(); $(`[data-card="${partner[0]}"]`).click(); await flush();
  }
  assert.equal(log.completions.length, 1);
  assert.equal(log.completions[0].mode, 'sound');
  assert.ok(log.spoken.includes('abk_well_done'));
  assert.ok(!log.spoken.includes('memory_match'), 'no "two pictures" praise for sound pairs');
  const expected = log.completions[0].mismatches <= 3 ? 1 : 0;
  assert.equal(JSON.parse(storage.getItem(SOUND_MEMORY_KEY)).level, expected);
}));

test('Hang–kép párok uses spoken names instead of pictures on the harder levels', withDom(MEMORY_HTML, async dom => {
  const { game, log, $, $$ } = memory(dom, { storage: memoryStorage({ [SOUND_MEMORY_KEY]: JSON.stringify({ level: 3 }) }) });
  game.start({ mode: 'sound' });
  for (const card of $$('[data-card]')) {
    card.click(); await flush();
    assert.ok(!card.querySelector('.word-picture') || card.classList.contains('is-matched'), 'no picture before a match');
    if ($$('.memory-card.is-open:not(.is-matched)').length === 2) await tick(1100);
  }
  assert.ok(log.spoken.some(id => id.startsWith('abk_name_')));
  assert.ok(log.animals.length > 0);
}));
