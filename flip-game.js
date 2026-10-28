import { wordPicture } from './word-art.js';
import { setGameTitle, focusGameTitle } from './game-heading.js';

export const FLIP_LEVELS_KEY = 'beszedtanulas.flipLevels.v1';
// Mi hiányzik? grows inside a round: one more card after each first-try answer, then two cards hide.
export const KIM_LEVELS = Object.freeze([
  Object.freeze({ cards: 3, hide: 1 }), Object.freeze({ cards: 4, hide: 1 }), Object.freeze({ cards: 5, hide: 1 }),
  Object.freeze({ cards: 6, hide: 1 }), Object.freeze({ cards: 6, hide: 2 }),
]);
export const KIM_QUESTIONS = 5;
export const FIND_SIZES = Object.freeze([4, 6, 8]);
const NEVER_SHOWN = 2;
const MODES = [['free', 'Meglepetések'], ['find', 'Hol bújt el?'], ['missing', 'Mi hiányzik?']];

function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
// The chosen topic comes first; other pictures only fill up a board the topic is too small for.
export function fillWordPool(words, extraWords = [], random = Math.random) {
  const topic = shuffled([...new Map(words.map(word => [word.id, word])).values()], random);
  const ids = new Set(topic.map(word => word.id));
  return [...topic, ...shuffled([...new Map(extraWords.filter(word => !ids.has(word.id)).map(word => [word.id, word])).values()], random)];
}
export function roundStars(good, total) {
  if (!total) return 1;
  return Math.max(1, Math.min(5, Math.round(5 * Math.max(0, good) / total)));
}

// Kim's game: the hidden cards leave the board, the rest move to new places, and the answer
// options mix the hidden pictures with pictures that were never on the board.
export function buildKimQuestion(words, extraWords = [], level = KIM_LEVELS[0], random = Math.random) {
  const { cards, hide } = level;
  const pool = fillWordPool(words, extraWords, random);
  if (pool.length < cards + NEVER_SHOWN) throw new Error('A Mi hiányzik? játékhoz több kép kell.');
  const shown = pool.slice(0, cards);
  const never = pool.slice(cards, cards + NEVER_SHOWN);
  const hiddenIds = new Set(shuffled(shown, random).slice(0, hide).map(word => word.id));
  const hidden = shown.filter(word => hiddenIds.has(word.id));
  const rest = shown.filter(word => !hiddenIds.has(word.id));
  let remaining = shuffled(rest, random);
  if (rest.length > 1 && remaining.every((word, i) => word === rest[i])) remaining = [...rest.slice(1), rest[0]];
  return { level, shown, hidden, remaining, options: shuffled([...hidden, ...never], random) };
}
export const adaptKimLevel = (level, firstTry) => Math.max(0, Math.min(KIM_LEVELS.length - 1, level + (firstTry ? 1 : -1)));
export const nextKimStart = endLevel => Math.max(0, Math.min(2, endLevel - 2));
export function nextFindSize(size, firstTry, total) {
  const index = Math.max(0, FIND_SIZES.indexOf(size));
  if (total - firstTry <= 1) return FIND_SIZES[Math.min(FIND_SIZES.length - 1, index + 1)];
  if (firstTry * 2 < total) return FIND_SIZES[Math.max(0, index - 1)];
  return FIND_SIZES[index];
}
export function normalizeFlipLevels(value) {
  return {
    kimStart: Number.isInteger(value?.kimStart) ? Math.max(0, Math.min(2, value.kimStart)) : 0,
    findSize: FIND_SIZES.includes(value?.findSize) ? value.findSize : FIND_SIZES[0],
  };
}

export function setupFlipGame({ effect = () => {}, onRestart = () => {}, getOptions, setMode, playWord, speak, stopPlayback, onComplete, storage = globalThis.localStorage }) {
  const root = document.querySelector('#flip');
  let active = false, mode = 'free', phase = 'preview', complete = false, generation = 0, timer = null;
  // Free and find modes: one deck. Missing mode: the current question.
  let deck = [], opened = new Set(), targetOrder = [], target = 0, misses = 0, firstTry = 0, wrongIndex = null;
  let kim = null, kimLevel = 0, kimIndex = 0, kimFound = new Set(), kimResults = [], status = '';
  let levels = normalizeFlipLevels(null);
  const readLevels = () => { try { return normalizeFlipLevels(JSON.parse(storage?.getItem(FLIP_LEVELS_KEY) ?? 'null')); } catch { return normalizeFlipLevels(null); } };
  const saveLevels = () => { try { storage?.setItem(FLIP_LEVELS_KEY, JSON.stringify(levels)); } catch {} };
  const $ = s => root.querySelector(s), allowed = () => active && !document.hidden;
  const cancel = () => { generation++; clearTimeout(timer); stopPlayback(); };
  function later(fn, delay) {
    const token = generation; clearTimeout(timer);
    timer = setTimeout(() => { if (token === generation && allowed()) fn(); }, delay);
  }

  const cardMarkup = (word, i, revealed, extra = '') => `<button type="button" class="flip-card ${revealed ? 'is-open' : ''} ${extra}" data-flip-index="${i}" data-word="${word.id}" aria-pressed="${revealed}" aria-label="${revealed ? word.label + ' meghallgatása' : 'Lefordított kártya ' + (i + 1)}" ${complete ? 'disabled' : ''}><span class="flip-card-face flip-card-back" aria-hidden="true">✦</span><span class="flip-card-face flip-card-front" aria-hidden="true"><span class="card-emoji">${wordPicture(word)}</span><span class="card-word">${word.label}</span></span></button>`;
  function boardCards() {
    if (mode !== 'missing') return deck.map((word, i) => {
      const revealed = mode === 'free' ? opened.has(i) : phase === 'preview' || opened.has(i) || i === wrongIndex;
      return cardMarkup(word, i, revealed, opened.has(i) && mode === 'find' ? 'is-success' : '');
    });
    if (!kim) return [];
    if (phase === 'preview') return kim.shown.map((word, i) => cardMarkup(word, i, true));
    if (phase === 'covering') return kim.shown.map((word, i) => cardMarkup(word, i, false));
    const back = phase === 'solved' || phase === 'done' ? kim.hidden.filter(word => kimFound.has(word.id)) : [];
    return [...kim.remaining.map((word, i) => cardMarkup(word, i, true)), ...back.map((word, i) => cardMarkup(word, kim.remaining.length + i, true, 'is-returned'))];
  }
  function progressMarkup() {
    if (mode === 'missing') return `<div class="round-progress flip-progress" role="img" aria-label="${kimResults.length} / ${KIM_QUESTIONS} kérdés">${Array.from({ length: KIM_QUESTIONS }, (_, i) => `<span class="progress-dot${i < kimResults.length ? ' is-done' : i === kimIndex ? ' is-current' : ''}${kimResults[i] ? ' is-star' : ''}" aria-hidden="true"></span>`).join('')}</div>`;
    if (mode === 'find' && phase !== 'preview') return `<div class="round-progress flip-progress" role="img" aria-label="${opened.size} / ${deck.length} kép">${deck.map((_, i) => `<span class="progress-dot${i < opened.size ? ' is-done' : i === opened.size ? ' is-current' : ''}" aria-hidden="true"></span>`).join('')}</div>`;
    return '';
  }
  function statusText() {
    if (status) return status;
    if (mode === 'free') return `${opened.size} / ${deck.length}`;
    if (mode === 'find') return complete ? 'Mindet megtaláltad!' : phase === 'preview' ? 'Jegyezd meg, mi hol van!' : `Keresd meg: ${deck[target]?.label}!`;
    if (phase === 'preview') return kim?.hidden.length === 2 ? 'Jegyezd meg! Most kettő bújik el.' : 'Jegyezd meg a képeket!';
    if (phase === 'covering') return 'Elbújnak…';
    return kim?.hidden.length === 2 ? 'Melyik kettő hiányzik?' : 'Melyik kép hiányzik?';
  }
  function render(focus) {
    const count = mode === 'missing' ? (phase === 'preview' || phase === 'covering' ? kim?.shown.length : kim?.remaining.length + (phase === 'solved' || phase === 'done' ? kimFound.size : 0)) : deck.length;
    const answerGrid = mode === 'missing' && kim && ['guess', 'solved', 'done'].includes(phase)
      ? `<div class="flip-answer-grid" role="group" aria-label="Melyik kép hiányzik?">${kim.options.map(word => {
        const found = kimFound.has(word.id);
        return `<button type="button" class="upgrade-action flip-answer ${found ? 'is-found' : ''}" data-missing-answer="${word.id}" aria-label="${word.label}${found ? ', megtaláltad' : ''}" ${found || phase !== 'guess' ? 'disabled' : ''}>${wordPicture(word)}</button>`;
      }).join('')}</div>` : '';
    root.innerHTML = `<div class="flip-game" data-flip-mode="${mode}" data-phase="${phase}"><div class="upgrade-options flip-modes" role="group" aria-label="Elbújós játék módja">${MODES.map(([id, name]) => `<button type="button" data-flip-mode="${id}" aria-pressed="${mode === id}">${name}</button>`).join('')}</div>
      ${progressMarkup()}<p id="flip-status" class="listen-status" role="status">${statusText()}</p>
      <div id="flip-grid" class="flip-grid" data-count="${count || 0}">${boardCards().join('')}</div>
      ${answerGrid}
      <div class="upgrade-options flip-actions">${mode !== 'free' && phase === 'preview' && !complete ? '<button type="button" id="flip-hide">🙈 Elbújhat!</button>' : ''}${mode !== 'free' && phase === 'guess' ? '<button type="button" id="flip-repeat" aria-label="Hallgassuk újra!">🔊</button>' : ''}<button type="button" id="flip-new" aria-label="Új képek">↻</button></div></div>`;
    if (focus) $(focus)?.focus({ preventScroll: true });
  }

  function newKimQuestion() {
    const opts = getOptions();
    kim = buildKimQuestion(opts.words, opts.allWords || [], KIM_LEVELS[kimLevel]);
    kimFound = new Set(); misses = 0; status = ''; phase = 'preview';
  }
  function start() {
    onRestart(); cancel(); active = true; complete = false; status = '';
    const opts = getOptions(); mode = opts.flipMode || 'free';
    levels = readLevels();
    opened = new Set(); misses = 0; firstTry = 0; wrongIndex = null;
    setGameTitle(root, 'Mi bújt el?');
    if (mode === 'missing') {
      kimLevel = levels.kimStart; kimIndex = 0; kimResults = [];
      newKimQuestion(); deck = [];
      render(); void speak(kim.hidden.length === 2 ? 'flip_missing_two' : 'flip_missing');
      return;
    }
    const size = mode === 'find' ? levels.findSize : 6;
    deck = fillWordPool(opts.words, mode === 'find' ? opts.allWords || [] : []).slice(0, size);
    deck = shuffled(deck); targetOrder = shuffled(deck.map((_, i) => i)); target = targetOrder[0];
    phase = mode === 'free' ? 'guess' : 'preview'; kim = null;
    render();
    if (mode === 'find') void speak('flip_preview');
  }
  function finish(stars) {
    if (complete) return;
    complete = true; phase = 'done'; clearTimeout(timer); render('#flip-new');
    onComplete(stars, { mode });
  }
  function repeat() {
    if (!allowed()) return;
    if (mode === 'find' && phase === 'guess') return speak(['flip_find', `word_${deck[target].id}`]);
    if (mode === 'missing' && phase === 'guess') return kim?.hidden.length === 2 ? undefined : speak('flip_choose_missing');
    return speak(mode === 'free' ? 'guide_flip' : mode === 'find' ? 'flip_preview' : kim?.hidden.length === 2 ? 'flip_missing_two' : 'flip_missing');
  }

  function hideKim() {
    phase = 'covering'; status = ''; effect('card'); render();
    later(showKimGuess, 750);
  }
  function showKimGuess() {
    phase = 'guess'; render('[data-missing-answer]');
    if (kim.hidden.length === 1) void speak('flip_choose_missing');
  }
  async function answerKim(id, button) {
    const word = kim.options.find(option => option.id === id);
    if (!word || kimFound.has(id)) return;
    if (!kim.hidden.some(hidden => hidden.id === id)) {
      misses++; effect('retry');
      button.classList.add('is-retry');
      status = kim.shown.some(shown => shown.id === id) ? 'Ez még itt van. Nézz körül!' : 'Ez nem volt a képek között.';
      $('#flip-status').textContent = status;
      if (misses >= 2) for (const hidden of kim.hidden) if (!kimFound.has(hidden.id)) $(`[data-missing-answer="${hidden.id}"]`)?.classList.add('is-hint');
      void speak('flip_retry');
      return;
    }
    kimFound.add(id); effect('collect');
    if (kimFound.size < kim.hidden.length) {
      status = 'Megvan az egyik! Hol a másik?';
      render('[data-missing-answer]:not(:disabled)');
      void playWord(word, { target: `[data-missing-answer="${id}"]` });
      return;
    }
    const clean = misses === 0;
    kimResults.push(clean);
    kimLevel = adaptKimLevel(kimLevel, clean);
    phase = 'solved';
    status = clean ? 'Megvan! ⭐' : 'Megvan!';
    render();
    const token = generation;
    await playWord(word, { target: `.flip-card.is-returned[data-word="${id}"] .card-emoji` });
    if (token !== generation || !allowed() || phase !== 'solved') return;
    later(nextKimStep, 900);
  }
  function nextKimStep() {
    if (phase !== 'solved') return;
    if (kimResults.length >= KIM_QUESTIONS) {
      levels.kimStart = nextKimStart(kimLevel); saveLevels();
      finish(roundStars(kimResults.filter(Boolean).length, KIM_QUESTIONS));
      return;
    }
    kimIndex = kimResults.length;
    newKimQuestion(); render('#flip-hide');
    void speak(kim.hidden.length === 2 ? 'flip_missing_two' : 'flip_missing');
  }

  root.addEventListener('click', async event => {
    const b = event.target.closest('button'); if (!b || b.disabled || !allowed()) return;
    if (b.dataset.flipMode) { setMode(b.dataset.flipMode); start(); focusGameTitle(root); return; }
    if (b.id === 'flip-new') { start(); $('#flip-new')?.focus({ preventScroll: true }); return; }
    if (b.id === 'flip-repeat') { repeat(); return; }
    if (complete) return;
    if (b.id === 'flip-hide') {
      if (mode === 'missing') { hideKim(); return; }
      phase = 'guess'; render('[data-flip-index="0"]'); repeat(); return;
    }
    if (b.dataset.missingAnswer) { if (mode === 'missing' && phase === 'guess') await answerKim(b.dataset.missingAnswer, b); return; }
    if (b.dataset.flipIndex === undefined) return;
    const index = Number(b.dataset.flipIndex);
    const cue = { target: `[data-flip-index="${index}"] .card-emoji` };
    if (mode === 'missing') {
      if (phase === 'covering') return;
      const word = [...(phase === 'preview' ? kim.shown : kim.remaining), ...kim.hidden.filter(hidden => kimFound.has(hidden.id))][index];
      if (word) await playWord(word, cue);
      return;
    }
    const word = deck[index];
    if (phase === 'preview') { await playWord(word, cue); return; }
    if (mode === 'free') {
      effect(opened.has(index) ? 'select' : 'card');
      opened.add(index); render(`[data-flip-index="${index}"]`);
      const token = generation, completed = opened.size === deck.length;
      await playWord(word, cue);
      // Exploring has nothing to get wrong: finishing earns the same three stars every time.
      if (completed && token === generation && allowed()) finish(3);
      return;
    }
    if (opened.has(index)) { void playWord(word, cue); return; }
    cancel();
    const token = generation;
    if (index !== target) {
      effect('retry'); misses++;
      wrongIndex = index; status = 'Ez egy másik kép. Próbáld újra!'; render();
      await playWord(word, cue);
      if (token !== generation || !allowed()) return;
      later(() => { wrongIndex = null; status = ''; render(); repeat(); }, 1100);
      return;
    }
    effect('collect'); wrongIndex = null; status = '';
    if (misses === 0) firstTry++;
    misses = 0; opened.add(index); target = targetOrder[opened.size];
    if (opened.size === deck.length) {
      levels.findSize = nextFindSize(deck.length, firstTry, deck.length); saveLevels();
      finish(roundStars(firstTry, deck.length));
      return;
    }
    render(`[data-flip-index="${index}"]`); repeat();
  });
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) { cancel(); return; }
    wrongIndex = null;
    if (mode === 'missing' && phase === 'covering') { showKimGuess(); return; }
    render();
    if (mode === 'missing' && phase === 'solved') later(nextKimStep, 600);
  });
  return { start, repeat, stop() { active = false; cancel(); } };
}
